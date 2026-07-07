import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        passwordHistory: [hashedPassword],
      },
    });

    const token = crypto.randomUUID();
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    console.log(
      `[Email Verification] Link: http://localhost:3000/auth/verify-email?token=${token}`,
    );

    await this.auditService.log('REGISTER', { userId: user.id });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
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
    await this.checkRateLimit(ipAddress);
    await this.checkLockout(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      await this.recordFailedLogin(dto.email);
      await this.auditService.log('LOGIN_FAILED', {
        metadata: { email: dto.email, reason: 'user_not_found' },
        ipAddress,
        userAgent,
        success: false,
      });
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

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.auditService.log('LOGIN', {
      userId: user.id,
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id },
    });

    return { accessToken, refreshToken, sessionId: session.id };
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
      const location = this.auditService.getLocation(ipAddress);
      console.log(
        `[New Device] User ${userId} logged in from a new device. IP: ${ipAddress}, Location: ${location}, User-Agent: ${userAgent}, Time: ${new Date().toISOString()}`,
      );
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
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
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

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token has expired',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const newRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        sessionId: stored.sessionId,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(user: any, token: string) {
    const payload = this.jwtService.verify(token);
    const jti = payload.jti;
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await this.redisService.set(`blacklist:${jti}`, '1', ttl);
    }

    await this.prisma.session.updateMany({
      where: { userId: user.sub, active: true },
      data: { active: false },
    });

    await this.auditService.log('LOGOUT', { userId: user.sub });

    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
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

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    const newHistory = [...user.passwordHistory, newHash].slice(-5);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        passwordHistory: newHistory,
      },
    });

    await this.auditService.log('PASSWORD_CHANGED', { userId });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const token = crypto.randomUUID();
      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      console.log(
        `[Password Reset] Link: http://localhost:3000/auth/reset-password?token=${token}`,
      );

      await this.auditService.log('PASSWORD_RESET_REQUESTED', { userId: user.id });
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
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

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'RESET_TOKEN_EXPIRED',
        message: 'Reset token has expired',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: reset.userId },
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

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    const newHistory = [...user.passwordHistory, newHash].slice(-5);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: newHash,
          passwordHistory: newHistory,
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ]);

    await this.auditService.log('PASSWORD_RESET_COMPLETED', { userId: user.id });

    return { message: 'Password reset successfully' };
  }

  async magicLink(dto: MagicLinkDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const token = crypto.randomUUID();
      await this.prisma.magicLink.create({
        data: {
          userId: user.id,
          email: dto.email,
          token,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      console.log(
        `[Magic Link] Login link: http://localhost:3000/auth/magic-link/verify?token=${token}`,
      );
    }

    return { message: 'If the email exists, a magic link has been sent' };
  }

  async verifyMagicLink(token: string) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
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

    if (magicLink.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'MAGIC_LINK_EXPIRED',
        message: 'Magic link has expired',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: magicLink.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    });

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

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.auditService.log('LOGIN', {
      userId: user.id,
      metadata: { method: 'magic_link' },
    });

    return { accessToken, refreshToken };
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
