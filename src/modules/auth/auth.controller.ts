import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import {
  registerSchema,
  RegisterDto,
} from './dto/register.dto';
import { loginSchema, LoginDto } from './dto/login.dto';
import { refreshSchema, RefreshDto } from './dto/refresh.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || 'Unknown';
    return this.authService.login(dto, userAgent, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto,
  ) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  async logout(@CurrentUser() user: any, @Req() req: Request) {
    const token = req.headers.authorization?.substring(7);
    return this.authService.logout(user, token);
  }

  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.authService.me(user.sub);
  }
}
