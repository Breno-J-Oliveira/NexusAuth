import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { validateWebhookUrl } from '../../common/utils/ssrf-guard';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWebhookDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException({ code: 'USER_NOT_FOUND' });
    }

    await validateWebhookUrl(dto.url);

    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        tenantId: user.tenantId,
        url: dto.url,
        events: dto.events,
        secret,
        active: true,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async list(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      hasSecret: true,
      active: w.active,
      createdAt: w.createdAt,
    }));
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== userId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND' });
    }

    if (dto.url) {
      await validateWebhookUrl(dto.url);
    }

    const updated = await this.prisma.webhook.update({
      where: { id },
      data: {
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.events && { events: dto.events }),
        ...(dto.url && { url: dto.url }),
      },
    });

    return {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      hasSecret: true,
      active: updated.active,
    };
  }

  async remove(userId: string, id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== userId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND' });
    }

    await this.prisma.webhook.delete({ where: { id } });
    return { message: 'Webhook deleted successfully' };
  }

  async listDeliveries(userId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || webhook.userId !== userId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND' });
    }

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
