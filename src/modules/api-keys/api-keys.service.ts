import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateApiKeyDto) {
    const rawKey = `nxs_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key: keyHash,
        userId,
        tenantId: user?.tenantId ?? null,
        permissions: dto.permissions,
        active: true,
      },
    });

    await this.auditService.log('API_KEY_CREATED', {
      userId,
      metadata: { apiKeyId: apiKey.id, name: dto.name },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      permissions: apiKey.permissions,
      active: apiKey.active,
      createdAt: apiKey.createdAt,
    };
  }

  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: `nxs_live_${k.key.substring(0, 4)}***`,
      permissions: k.permissions,
      active: k.active,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  }

  async revoke(userId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.userId !== userId) {
      throw new NotFoundException({ code: 'API_KEY_NOT_FOUND' });
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { active: false },
    });

    await this.auditService.log('API_KEY_REVOKED', {
      userId,
      metadata: { apiKeyId: id },
    });

    return { message: 'API key revoked successfully' };
  }

  async validate(rawKey: string) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: keyHash },
    });

    if (!apiKey || !apiKey.active) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      userId: apiKey.userId,
      tenantId: apiKey.tenantId,
      permissions: apiKey.permissions,
    };
  }
}
