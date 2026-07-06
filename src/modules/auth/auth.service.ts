import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from './jwt.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async login(
    dto: LoginDto,
    device: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Account has no password set');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        device,
        ipAddress,
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

    return { accessToken, refreshToken };
  }

  async refresh(dto: RefreshDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
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

    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
