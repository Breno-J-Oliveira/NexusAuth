import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const [db, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbOk = db.status === 'fulfilled';
    const redisOk = redis.status === 'fulfilled';
    const allOk = dbOk && redisOk;

    return {
      status: allOk ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbOk ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(db.status === 'rejected' && { error: 'Database connection failed' }),
        },
        redis: {
          status: redisOk ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(redis.status === 'rejected' && { error: 'Redis connection failed' }),
        },
      },
    };
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
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(db.status === 'rejected' && { error: 'Database connection failed' }),
        },
        redis: {
          status: redis.status === 'fulfilled' ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(redis.status === 'rejected' && { error: 'Redis connection failed' }),
        },
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    const pong = await this.redisService.ping();
    if (pong !== 'PONG') {
      throw new Error(`Redis returned: ${pong}`);
    }
  }
}
