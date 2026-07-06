import { Module } from '@nestjs/common';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { JwtService } from '../auth/jwt.service';

@Module({
  controllers: [TwoFactorController],
  providers: [TwoFactorService, JwtService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
