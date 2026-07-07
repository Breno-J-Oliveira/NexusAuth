import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, active: true },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        device: true,
        ipAddress: true,
        location: true,
        userAgent: true,
        active: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    return sessions;
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
      });
    }

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { active: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    await this.auditService.log('SESSION_REVOKED', {
      userId,
      metadata: { sessionId },
    });

    return { message: 'Session revoked successfully' };
  }

  async logoutAll(userId: string, currentSessionId?: string) {
    const where: any = { userId, active: true };
    if (currentSessionId) {
      where.id = { not: currentSessionId };
    }

    const sessions = await this.prisma.session.findMany({ where });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await this.prisma.$transaction([
        this.prisma.session.updateMany({
          where: { id: { in: sessionIds } },
          data: { active: false },
        }),
        this.prisma.refreshToken.updateMany({
          where: { sessionId: { in: sessionIds }, revoked: false },
          data: { revoked: true },
        }),
      ]);
    }

    await this.auditService.log('GLOBAL_LOGOUT', {
      userId,
      metadata: { revokedSessions: sessionIds.length },
    });

    return {
      message: 'All sessions revoked successfully',
      revokedCount: sessionIds.length,
    };
  }
}
