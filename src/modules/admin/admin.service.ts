import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from '../auth/jwt.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async impersonate(adminId: string, targetUserId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'NOT_ADMIN',
        message: 'Only admins can impersonate',
      });
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found',
      });
    }

    if (target.id === adminId) {
      throw new BadRequestException({
        code: 'CANNOT_IMPERSONATE_SELF',
        message: 'Cannot impersonate yourself',
      });
    }

    // B4 fix: prevent admin from impersonating another admin
    if (target.role === 'ADMIN') {
      throw new ForbiddenException({
        code: 'CANNOT_IMPERSONATE_ADMIN',
        message: 'Cannot impersonate another admin user',
      });
    }

    // V1 fix: prevent cross-tenant impersonation
    if (admin.tenantId && target.tenantId && admin.tenantId !== target.tenantId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_IMPERSONATION_BLOCKED',
        message: 'Cannot impersonate users from other tenants',
      });
    }

    const impersonationToken = this.jwtService.signImpersonationToken({
      sub: target.id,
      email: target.email,
      role: target.role,
      tenantId: target.tenantId ?? undefined,
      permissions: target.permissions ?? undefined,
      impersonatedBy: adminId,
    });

    await this.auditService.log('IMPERSONATION_STARTED', {
      userId: adminId,
      metadata: {
        targetUserId: target.id,
        targetEmail: target.email,
      },
    });

    return {
      impersonationToken,
      targetUser: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
      },
    };
  }

  async stopImpersonation(user: any, token: string) {
    const payload = this.jwtService.verify(token);

    if (payload.type !== 'impersonation') {
      throw new BadRequestException({
        code: 'NOT_IMPERSONATION_TOKEN',
        message: 'Token is not an impersonation token',
      });
    }

    const jti = payload.jti;
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await this.redisService.set(`blacklist:${jti}`, '1', ttl);
    }

    await this.auditService.log('IMPERSONATION_ENDED', {
      userId: payload.impersonatedBy,
      metadata: {
        impersonatedUserId: payload.sub,
      },
    });

    return { message: 'Impersonation stopped successfully' };
  }
}
