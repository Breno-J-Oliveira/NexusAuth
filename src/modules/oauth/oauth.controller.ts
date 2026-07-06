import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OAuthService } from './oauth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
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
    const result = await this.oauthService.handleOAuthLogin(req.user as any);
    res.json(result);
  }
}
