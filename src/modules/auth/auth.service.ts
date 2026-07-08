import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from './jwt.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MagicLinkDto } from './dto/magic-link.dto';
import { AuditService } from '../audit/audit.service';
import { WebhooksDispatcher } from '../webhooks/webhooks.dispatcher';
import { MetricsService } from '../metrics/metrics.service';
import { hashToken } from '../../common/utils/crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private webhooksDispatcher: WebhooksDispatcher,
    private metricsService: MetricsService,
  ) {}

  async register(dto: RegisterDto) {
    // CRITICAL FIX: Prevent race condition in registration using Redis lock
    const lockKey = `register:lock:${dto.email.toLowerCase()}`;
    const lockAcquired = await this.redisService.set(lockKey, '1', 10); // 10 second lock
    
    if (!lockAcquired) {
      // Another registration is in progress for this email
      return {
        message: 'If this email is not already registered, an account has been created and a verification link has been sent.',
      };
    }

    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        return {
          message: 'If this email is not already registered, an account has been created and a verification link has been sent.',
        };
      }

      const hashedPassword = await bcrypt.hash(dto.password, 12);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          passwordHistory: [hashedPassword],
        },
      });

      const rawToken = crypto.randomUUID();
      const hashedToken = hashToken(rawToken);
      await this.prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[Email Verification] Link: http://localhost:3000/auth/verify-email?token=${rawToken}`,
        );
      }

      await this.auditService.log('REGISTER', { userId: user.id });
      this.metricsService.authRegistrationsTotal.inc();

      await this.webhooksDispatcher.dispatch('user.registered', {
        userId: user.id,
        email: user.email,
        name: user.name,
      }, user.tenantId);

      return {
        message: 'If this email is not already registered, an account has been created and a verification link has been sent.',
      };
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  async checkRateLimit(ipAddress: string): Promise<void> {
    const key = `ratelimit:login:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, 60);
    }
    if (count > 5) {
      const ttl = await this.redisService.ttl(key);
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // M1 fix: generic rate limit for any endpoint
  async checkGenericRateLimit(key: string, max: number, ttlSeconds: number): Promise<void> {
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, ttlSeconds);
    }
    if (count > max) {
      const ttl = await this.redisService.ttl(key);
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async checkLockout(email: string): Promise<void> {
    const key = `lockout:${email}`;
    const count = await this.redisService.get(key);
    if (count && parseInt(count, 10) >= 5) {
      const ttl = await this.redisService.ttl(key);
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked due to too many failed attempts.',
          retryAfter: ttl,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async login(
    dto: LoginDto,
    device: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const startTime = Date.now();
    
    await this.checkRateLimit(ipAddress);
    await this.checkLockout(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      // V-EXT-003 fix: Add delay to prevent user enumeration via timing attacks
      // Simulate bcrypt.compare timing (~200-300ms typical for bcrypt)
      await new Promise(resolve => setTimeout(resolve, 250));
      
      await this.recordFailedLogin(dto.email);
      await this.auditService.log('LOGIN_FAILED', {
        metadata: { email: dto.email, reason: 'user_not_found' },
        ipAddress,
        userAgent,
        success: false,
      });
      this.metricsService.authLoginsTotal.inc({ status: 'failed' });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    if (!user.password) {
      throw new UnauthorizedException({
        code: 'NO_PASSWORD_SET',
        message: 'Account has no password set',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      await this.recordFailedLogin(dto.email);
      await this.auditService.log('LOGIN_FAILED', {
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'wrong_password' },
        success: false,
      });
      this.metricsService.authLoginsTotal.inc({ status: 'failed' });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    await this.redisService.del(`lockout:${dto.email}`);

    if (user.twoFactorEnabled) {
      const challengeToken = this.jwtService.signChallengeToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      await this.auditService.log('TWO_FACTOR_CHALLENGE', {
        userId: user.id,
        ipAddress,
        userAgent,
      });
      return { requiresTwoFactor: true, challengeToken };
    }

    await this.detectNewDevice(user.id, userAgent, ipAddress);

    const location = this.auditService.getLocation(ipAddress);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        device,
        ipAddress,
        location,
        userAgent,
      },
    });

    const rawRefreshToken = crypto.randomUUID();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      permissions: user.permissions ?? undefined,
      sessionId: session.id,
    });

    await this.auditService.log('LOGIN', {
      userId: user.id,
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id },
    });

    await this.webhooksDispatcher.dispatch('user.login', {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    }, user.tenantId);

    this.metricsService.authLoginsTotal.inc({ status: 'success' });

    return { accessToken, refreshToken: rawRefreshToken, sessionId: session.id };
  }

  private async detectNewDevice(
    userId: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<void> {
    const fingerprint = crypto
      .createHash('sha256')
      .update(userAgent + ipAddress)
      .digest('hex');

    const existingSession = await this.prisma.session.findFirst({
      where: { userId, userAgent, ipAddress, active: true },
    });

    if (!existingSession) {
      // V16 fix: use Logger instead of console.log, avoid PII in production
      const logger = new Logger('NewDeviceDetection');
      if (process.env.NODE_ENV !== 'production') {
        logger.log(
          `User ${userId} logged in from a new device. IP: ${ipAddress}, User-Agent: ${userAgent}`,
        );
      } else {
        logger.log(`User ${userId} logged in from a new device.`);
      }
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const key = `lockout:${email}`;
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, 15 * 60);
    }
  }

  async refresh(dto: RefreshDto) {
    const hashedRefreshToken = hashToken(dto.refreshToken);
    // C3 fix: atomic update — only revoke if not already revoked (prevents race condition)
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        token: hashedRefreshToken,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      data: { revoked: true },
    });

    if (result.count === 0) {
      // Token is either invalid, already revoked, or expired
      const stored = await this.prisma.refreshToken.findUnique({
        where: { token: hashedRefreshToken },
      });
      if (!stored) {
        throw new UnauthorizedException({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        });
      }
      if (stored.revoked) {
        throw new UnauthorizedException({
          code: 'REFRESH_TOKEN_REVOKED',
          message: 'Refresh token has been revoked',
        });
      }
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token has expired',
      });
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashedRefreshToken },
    });
    if (!stored) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    // C2 fix: check that the session is still active
    const session = await this.prisma.session.findUnique({
      where: { id: stored.sessionId },
    });
    if (!session || !session.active) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Session has been revoked',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const newRawRefreshToken = crypto.randomUUID();
    const newHashedRefreshToken = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: newHashedRefreshToken,
        userId: user.id,
        sessionId: stored.sessionId,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      permissions: user.permissions ?? undefined,
      sessionId: stored.sessionId,
    });

    this.metricsService.authRefreshTokensIssuedTotal.inc();
    return { accessToken, refreshToken: newRawRefreshToken };
  }

  async logout(user: any, token: string, refreshToken?: string) {
    const payload = this.jwtService.verify(token);
    const jti = payload.jti;
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await this.redisService.set(`blacklist:${jti}`, '1', ttl);
    }

    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId: user.sub },
        data: { revoked: true },
      });
    }

    // C2 fix: revoke ALL refresh tokens for user's active sessions, not just the one sent by client
    const activeSessions = await this.prisma.session.findMany({
      where: { userId: user.sub, active: true },
      select: { id: true },
    });
    const sessionIds = activeSessions.map((s) => s.id);

    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId: user.sub, active: true },
        data: { active: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds }, revoked: false },
        data: { revoked: true },
      }),
    ]);

    await this.auditService.log('LOGOUT', { userId: user.sub });

    await this.webhooksDispatcher.dispatch('user.logout', {
      userId: user.sub,
    });

    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    // M1 fix: rate limit password change attempts
    await this.checkGenericRateLimit(`ratelimit:change-pw:${userId}`, 5, 60);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (!user.password) {
      throw new BadRequestException({
        code: 'NO_PASSWORD_SET',
        message: 'Account has no password set',
      });
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }

    for (const oldHash of user.passwordHistory) {
      const matches = await bcrypt.compare(dto.newPassword, oldHash);
      if (matches) {
        throw new BadRequestException({
          code: 'PASSWORD_IN_HISTORY',
          message: 'New password matches one of the last 5 passwords',
        });
      }
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    const newHistory = [...user.passwordHistory, newHash].slice(-5);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        passwordHistory: newHistory,
      },
    });

    // A3 fix: revoke all sessions and refresh tokens after password change
    const activeSessions = await this.prisma.session.findMany({
      where: { userId, active: true },
      select: { id: true },
    });
    const sessionIds = activeSessions.map((s) => s.id);
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

    await this.auditService.log('PASSWORD_CHANGED', { userId });

    await this.webhooksDispatcher.dispatch('user.password_changed', {
      userId,
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // M1 fix: rate limit forgot-password by email
    await this.checkGenericRateLimit(`ratelimit:forgot:${dto.email}`, 3, 300);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const rawToken = crypto.randomUUID();
      const hashedToken = hashToken(rawToken);
      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // M2 fix: only log reset links in non-production
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[Password Reset] Link: http://localhost:3000/auth/reset-password?token=${rawToken}`,
        );
      }

      await this.auditService.log('PASSWORD_RESET_REQUESTED', { userId: user.id });
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress: string) {
    // V10 fix: rate limit reset-password per-IP instead of global
    await this.checkGenericRateLimit(`ratelimit:reset-pw:${ipAddress}`, 10, 60);
    const hashedToken = hashToken(dto.token);
    // V4 fix: atomic update — only set used=true if not already used and not expired
    const result = await this.prisma.passwordReset.updateMany({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    if (result.count === 0) {
      const reset = await this.prisma.passwordReset.findUnique({
        where: { token: hashedToken },
      });
      if (!reset) {
        throw new BadRequestException({
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired reset token',
        });
      }
      if (reset.used) {
        throw new BadRequestException({
          code: 'RESET_TOKEN_ALREADY_USED',
          message: 'Reset token has already been used',
        });
      }
      throw new BadRequestException({
        code: 'RESET_TOKEN_EXPIRED',
        message: 'Reset token has expired',
      });
    }

    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: hashedToken },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: reset!.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    for (const oldHash of user.passwordHistory) {
      const matches = await bcrypt.compare(dto.newPassword, oldHash);
      if (matches) {
        throw new BadRequestException({
          code: 'PASSWORD_IN_HISTORY',
          message: 'New password matches one of the last 5 passwords',
        });
      }
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    const newHistory = [...user.passwordHistory, newHash].slice(-5);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHash,
        passwordHistory: newHistory,
      },
    });

    // A3 fix: revoke all sessions and refresh tokens after password reset
    const activeSessions = await this.prisma.session.findMany({
      where: { userId: user.id, active: true },
      select: { id: true },
    });
    const sessionIds = activeSessions.map((s) => s.id);
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

    await this.auditService.log('PASSWORD_RESET_COMPLETED', { userId: user.id });

    return { message: 'Password reset successfully' };
  }

  async magicLink(dto: MagicLinkDto) {
    // M1 fix: rate limit magic-link by email
    await this.checkGenericRateLimit(`ratelimit:magic:${dto.email}`, 3, 300);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const rawToken = crypto.randomUUID();
      const hashedToken = hashToken(rawToken);
      await this.prisma.magicLink.create({
        data: {
          userId: user.id,
          email: dto.email,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // M2 fix: only log magic links in non-production
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[Magic Link] Login link: http://localhost:3000/auth/magic-link/verify?token=${rawToken}`,
        );
      }
    }

    return { message: 'If the email exists, a magic link has been sent' };
  }

  async verifyMagicLink(token: string) {
    const hashedToken = hashToken(token);
    // V5 fix: atomic update — only set used=true if not already used and not expired
    const result = await this.prisma.magicLink.updateMany({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    if (result.count === 0) {
      const magicLink = await this.prisma.magicLink.findUnique({
        where: { token: hashedToken },
      });
      if (!magicLink) {
        throw new BadRequestException({
          code: 'INVALID_MAGIC_LINK',
          message: 'Invalid or expired magic link',
        });
      }
      if (magicLink.used) {
        throw new BadRequestException({
          code: 'MAGIC_LINK_ALREADY_USED',
          message: 'Magic link has already been used',
        });
      }
      throw new BadRequestException({
        code: 'MAGIC_LINK_EXPIRED',
        message: 'Magic link has expired',
      });
    }

    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token: hashedToken },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: magicLink!.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.twoFactorEnabled) {
      const challengeToken = this.jwtService.signChallengeToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      return { requiresTwoFactor: true, challengeToken };
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        device: 'Magic Link',
        ipAddress: 'Unknown',
        userAgent: 'Unknown',
      },
    });

    const rawRefreshToken = crypto.randomUUID();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      permissions: user.permissions ?? undefined,
      sessionId: session.id,
    });

    await this.auditService.log('LOGIN', {
      userId: user.id,
      metadata: { method: 'magic_link' },
    });

    await this.webhooksDispatcher.dispatch('user.login', {
      userId: user.id,
      email: user.email,
      method: 'magic_link',
    }, user.tenantId);

    return { accessToken, refreshToken: rawRefreshToken };
  }

  // V13 fix: implement email verification endpoint
  async verifyEmail(token: string) {
    const hashedToken = hashToken(token);
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token: hashedToken },
    });

    if (!verification) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Invalid verification token',
      });
    }

    if (verification.used) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_ALREADY_USED',
        message: 'Verification token has already been used',
      });
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'Verification token has expired',
      });
    }

    // V13 fix: atomic update to prevent race condition
    const result = await this.prisma.emailVerification.updateMany({
      where: { token: hashedToken, used: false, expiresAt: { gt: new Date() } },
      data: { used: true },
    });

    if (result.count === 0) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_INVALID',
        message: 'Invalid or expired verification token',
      });
    }

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

    await this.auditService.log('EMAIL_VERIFIED', { userId: verification.userId });

    return { message: 'Email verified successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    return user;
  }
}
