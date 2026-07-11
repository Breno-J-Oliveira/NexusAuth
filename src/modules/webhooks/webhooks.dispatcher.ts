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

// V57 FIX: helper to mask secrets in URLs before logging
function redactUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    // Remove query string entirely; show only host and pathname
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '[invalid-url]';
  }
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

    let pinnedUrl: string;
    try {
      pinnedUrl = await validateWebhookUrl(url);
    } catch (err: any) {
      // V57 FIX: do NOT log the URL (it may contain query-string tokens); log only that validation failed
      const logMessage = err instanceof Error ? err.message : 'Unknown SSRF validation error';
      this.logger.error(`Webhook ${webhookId} URL blocked by SSRF guard: ${logMessage}`);

      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event: payload.event,
          payload: body as any,
          statusCode: null,
          attempt: 1,
          success: false,
          errorMessage: 'URL validation failed',
        },
      });

      this.metricsService.webhooksDispatchedTotal.inc({ status: 'failed' });
      return;
    }

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const result = await this.deliver(pinnedUrl, body, signature, payload.event, attempt, url);

      // V57 FIX: sanitize error messages before storing - do not leak DNS/network/internal details
      const sanitizedError = result.error
        ? (result.error.includes('fetch') ? 'Connection failed' : result.error.length > 200 ? result.error.substring(0, 200) : result.error)
        : undefined;

      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event: payload.event,
          payload: body as any,
          statusCode: result.statusCode,
          attempt,
          success: result.success,
          errorMessage: sanitizedError,
        },
      });

      if (result.success) {
        this.logger.log(`Webhook ${webhookId} delivered (attempt ${attempt})`);
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'success' });
        return;
      }

      if (attempt < this.maxAttempts) {
        const delay = this.backoffMs[attempt - 1];
        // V57 FIX: do not log the URL or the error details
        this.logger.warn(`Webhook ${webhookId} attempt ${attempt} failed, retrying in ${delay}ms`);
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
    pinnedUrl: string,
    body: string,
    signature: string,
    eventName: string,
    attempt: number,
    originalUrl: string,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let hostHeader = '';
      try {
        const parsed = new URL(originalUrl);
        hostHeader = parsed.host;
      } catch {
        hostHeader = '';
      }

      const res = await fetch(pinnedUrl, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventName,
          ...(hostHeader ? { 'Host': hostHeader } : {}),
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
      // V57 FIX: never echo raw error.message - it can contain DNS details, IPs, etc.
      const sanitizedError = err.name === 'AbortError'
        ? 'Request timeout'
        : err.name === 'TypeError'
        ? 'Network error'
        : 'Delivery failed';

      return { success: false, error: sanitizedError };
    }
  }
}
