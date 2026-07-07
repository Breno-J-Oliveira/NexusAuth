import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Tenant')
@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar novo tenant' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantService.createTenant(user.sub, dto);
  }

  @Post('invite')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Convidar usuário para o tenant (requer permissão tenant:manage)' })
  @UseGuards(PermissionGuard)
  @RequirePermission('tenant:manage')
  async invite(
    @CurrentUser() user: any,
    @Body() dto: InviteTenantDto,
  ) {
    return this.tenantService.invite(user.sub, dto);
  }

  @Post('invite/accept')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Aceitar convite para tenant' })
  async acceptInvitation(
    @CurrentUser() user: any,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.tenantService.acceptInvitation(user.sub, dto);
  }

  @Get('members')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar membros do tenant (requer permissão users:read)' })
  @UseGuards(PermissionGuard)
  @RequirePermission('users:read')
  async listMembers(@CurrentUser() user: any) {
    return this.tenantService.listMembers(user.sub);
  }
}
