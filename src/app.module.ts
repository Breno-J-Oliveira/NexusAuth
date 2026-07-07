import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwksModule } from './modules/jwks/jwks.module';
import { TwoFactorModule } from './modules/two-factor/two-factor.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { AuditModule } from './modules/audit/audit.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    JwksModule,
    TwoFactorModule,
    OAuthModule,
    AuditModule,
    SessionsModule,
    TenantModule,
    AdminModule,
    WebhooksModule,
    ApiKeysModule,
  ],
})
export class AppModule {}
