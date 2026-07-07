import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '../auth/jwt.service';
import { AuditService } from '../audit/audit.service';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
}

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async handleOAuthLogin(profile: OAuthProfile) {
    const providerIdField =
      profile.provider === 'google' ? 'googleId' : 'githubId';

    let user = await this.prisma.user.findFirst({
      where: { [providerIdField]: profile.providerId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { [providerIdField]: profile.providerId },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            password: null,
            passwordHistory: [],
            [providerIdField]: profile.providerId,
          },
        });
      }
    }

    if (user.twoFactorEnabled) {
      const challengeToken = this.jwtService.signChallengeToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      return { requiresTwoFactor: true, challengeToken };
    }

    return this.generateTokens(user.id, user.email, user.role, profile.provider);
  }

  private async generateTokens(userId: string, email: string, role: string, provider: string) {
    const session = await this.prisma.session.create({
      data: {
        userId,
        device: 'OAuth2',
        ipAddress: 'Unknown',
        userAgent: 'Unknown',
      },
    });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: userId,
      email,
      role,
    });

    await this.auditService.log('LOGIN', {
      userId,
      metadata: { method: `oauth_${provider}` },
    });

    return { accessToken, refreshToken };
  }
}
