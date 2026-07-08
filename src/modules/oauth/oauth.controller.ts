import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OAuthService } from './oauth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../redis/redis.service';

@Controller('auth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    private redisService: RedisService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // V2 fix: rate limit OAuth callback per IP
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:oauth:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const result = await this.oauthService.handleOAuthLogin(req.user as any);
    res.json(result);
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {}

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    // V2 fix: rate limit OAuth callback per IP
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:oauth:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const result = await this.oauthService.handleOAuthLogin(req.user as any);
    res.json(result);
  }
}
