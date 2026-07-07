import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createTenant(userId: string, dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_ALREADY_EXISTS',
        message: 'Tenant slug already exists',
      });
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id,
        role: 'ADMIN',
        permissions: ['tenant:manage', 'users:read', 'users:write', 'billing:manage'],
      },
    });

    await this.auditService.log('TENANT_USER_INVITED', {
      userId,
      metadata: { tenantId: tenant.id, action: 'tenant_created' },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    };
  }

  async invite(userId: string, dto: InviteTenantDto) {
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!admin || !admin.tenantId) {
      throw new ForbiddenException({
        code: 'NO_TENANT',
        message: 'You must belong to a tenant to invite users',
      });
    }

    const existingInvite = await this.prisma.tenantInvitation.findFirst({
      where: {
        tenantId: admin.tenantId,
        email: dto.email,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException({
        code: 'INVITE_ALREADY_EXISTS',
        message: 'An active invitation already exists for this email',
      });
    }

    const token = crypto.randomUUID();
    await this.prisma.tenantInvitation.create({
      data: {
        tenantId: admin.tenantId,
        email: dto.email,
        role: (dto.role as any) ?? 'USER',
        token,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(
      `[Tenant Invite] Link: http://localhost:3000/tenant/invite/accept?token=${token}`,
    );

    await this.auditService.log('TENANT_USER_INVITED', {
      userId,
      metadata: { tenantId: admin.tenantId, invitedEmail: dto.email, role: dto.role ?? 'USER' },
    });

    return { message: 'Invitation sent successfully' };
  }

  async acceptInvitation(userId: string, dto: AcceptInvitationDto) {
    const invitation = await this.prisma.tenantInvitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    if (invitation.accepted) {
      throw new BadRequestException({
        code: 'INVITATION_ALREADY_ACCEPTED',
        message: 'Invitation already accepted',
      });
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'Invitation has expired',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.email !== invitation.email) {
      throw new ForbiddenException({
        code: 'EMAIL_MISMATCH',
        message: 'This invitation is for a different email',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          tenantId: invitation.tenantId,
          role: invitation.role,
        },
      }),
      this.prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      }),
    ]);

    await this.auditService.log('TENANT_USER_INVITED', {
      userId,
      metadata: { tenantId: invitation.tenantId, action: 'invitation_accepted' },
    });

    return { message: 'Invitation accepted successfully' };
  }

  async listMembers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.tenantId) {
      throw new ForbiddenException({
        code: 'NO_TENANT',
        message: 'You must belong to a tenant',
      });
    }

    const members = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }
}
