import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { AuditModule } from '../audit/audit.module';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [AuditModule],
  controllers: [TenantController],
  providers: [TenantService, JwtService],
})
export class TenantModule {}
