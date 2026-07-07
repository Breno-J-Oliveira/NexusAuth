import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.sessionsService.listSessions(user.sub);
  }

  @Delete(':id')
  async revoke(
    @CurrentUser() user: any,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.revokeSession(user.sub, sessionId);
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: any,
    @Query('keepCurrent') keepCurrent: string,
  ) {
    const keep = keepCurrent === 'true';
    return this.sessionsService.logoutAll(user.sub, keep ? user.sessionId : undefined);
  }
}
