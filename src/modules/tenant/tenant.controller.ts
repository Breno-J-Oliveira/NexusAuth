import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantService.createTenant(user.sub, dto);
  }

  @Post('invite')
  async invite(
    @CurrentUser() user: any,
    @Body() dto: InviteTenantDto,
  ) {
    return this.tenantService.invite(user.sub, dto);
  }

  @Post('invite/accept')
  async acceptInvitation(
    @CurrentUser() user: any,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.tenantService.acceptInvitation(user.sub, dto);
  }

  @Get('members')
  @UseGuards(PermissionGuard)
  @RequirePermission('users:read')
  async listMembers(@CurrentUser() user: any) {
    return this.tenantService.listMembers(user.sub);
  }
}
