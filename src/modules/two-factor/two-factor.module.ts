import { Module } from '@nestjs/common';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { JwtService } from '../auth/jwt.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, JwtService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
