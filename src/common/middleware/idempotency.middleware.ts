import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../redis/redis.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

/**
 * Idempotency middleware.
 *
 * For mutating requests (POST/PUT/PATCH), require an Idempotency-Key
 * header. The first request is processed normally and the response is
 * cached. Subsequent requests with the same key return the cached
 * response, preventing duplicate operations on retries.
 *
 * Routes that require idempotency can be configured per-controller.
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const key = req.headers[IDEMPOTENCY_HEADER] as string;
    if (!key) {
      // Idempotency-Key is optional but recommended; only enforce on specific routes
      return next();
    }

    if (key.length < 16 || key.length > 255) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be between 16 and 255 characters',
      });
    }

    // Validate format (alphanumeric + hyphens)
    if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be alphanumeric with hyphens/underscores',
      });
    }

    const cacheKey = `idempotency:${req.user?.sub || 'anon'}:${key}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        res.setHeader('Idempotent-Replay', 'true');
        res.setHeader('X-Idempotency-Key', key);
        return res.status(parsed.status).json(parsed.body);
      } catch {
        // Corrupted cache, proceed normally
        await this.redisService.del(cacheKey);
      }
    }

    // Wrap res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache 2xx responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const data = JSON.stringify({ status: res.statusCode, body });
        this.redisService.set(cacheKey, data, IDEMPOTENCY_TTL).catch(() => {
          // Best-effort caching; ignore errors
        });
      }
      return originalJson(body);
    };

    next();
  }
}
