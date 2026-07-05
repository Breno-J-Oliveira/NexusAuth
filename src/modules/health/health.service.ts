import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private redis: Redis;

  constructor(private prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async checkAll() {
    const [db, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      status:
        db.status === 'fulfilled' && redis.status === 'fulfilled'
          ? 'ok'
          : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: db.status === 'fulfilled' ? 'ok' : 'error',
          ...(db.status === 'rejected' && { error: db.reason?.message }),
        },
        redis: {
          status: redis.status === 'fulfilled' ? 'ok' : 'error',
          ...(redis.status === 'rejected' && { error: redis.reason?.message }),
        },
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    const pong = await this.redis.ping();
    if (pong !== 'PONG') {
      throw new Error(`Redis returned: ${pong}`);
    }
  }
}
