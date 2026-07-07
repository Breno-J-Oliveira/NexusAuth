import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('impersonate/:userId')
  @Roles('ADMIN')
  async impersonate(
    @CurrentUser() user: any,
    @Param('userId') targetUserId: string,
  ) {
    if (user.type === 'impersonation') {
      throw new ForbiddenException({
        code: 'IMPERSONATION_CHAINING_BLOCKED',
        message: 'Cannot impersonate while already impersonating',
      });
    }

    return this.adminService.impersonate(user.sub, targetUserId);
  }

  @Post('stop-impersonation')
  async stopImpersonation(
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const token = req.headers.authorization?.substring(7);
    return this.adminService.stopImpersonation(user, token);
  }
}
