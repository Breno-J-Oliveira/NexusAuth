import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { validateWebhookUrl } from '../../common/utils/ssrf-guard';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

@Injectable()
export class WebhooksDispatcher {
  private readonly logger = new Logger(WebhooksDispatcher.name);
  private readonly maxAttempts = 3;
  private readonly backoffMs = [1000, 5000, 15000];

  constructor(
    private prisma: PrismaService,
    private metricsService: MetricsService,
  ) {}

  async dispatch(event: string, data: Record<string, any>, tenantId?: string | null) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        active: true,
        events: { has: event },
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of webhooks) {
      setImmediate(() => this.deliverWithRetry(webhook.id, webhook.url, webhook.secret, payload));
    }
  }

  private async deliverWithRetry(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
  ) {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    try {
      await validateWebhookUrl(url);
    } catch (err: any) {
      this.logger.error(`Webhook ${webhookId} URL blocked by SSRF guard: ${err.message?.message ?? err.message}`);
      this.metricsService.webhooksDispatchedTotal.inc({ status: 'failed' });
      return;
    }

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const result = await this.deliver(url, body, signature, payload.event, attempt);

      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event: payload.event,
          payload: body as any,
          statusCode: result.statusCode,
          attempt,
          success: result.success,
          errorMessage: result.error,
        },
      });

      if (result.success) {
        this.logger.log(`Webhook ${webhookId} delivered (attempt ${attempt})`);
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'success' });
        return;
      }

      if (attempt < this.maxAttempts) {
        const delay = this.backoffMs[attempt - 1];
        this.logger.warn(
          `Webhook ${webhookId} attempt ${attempt} failed (${result.error}), retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        this.logger.error(
          `Webhook ${webhookId} failed after ${this.maxAttempts} attempts`,
        );
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'failed' });
      }
    }
  }

  private async deliver(
    url: string,
    body: string,
    signature: string,
    eventName: string,
    attempt: number,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventName,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status >= 200 && res.status < 300) {
        return { success: true, statusCode: res.status };
      }

      return { success: false, statusCode: res.status, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
