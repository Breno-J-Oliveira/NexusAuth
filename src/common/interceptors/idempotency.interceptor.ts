import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { tap, mergeMap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RedisService } from '../../redis/redis.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24h
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Idempotency interceptor.
 *
 * Implemented as a NestJS INTERCEPTOR (not Express middleware) so it
 * runs AFTER guards and AFTER the JWT auth guard has populated
 * `req.user`. This is essential because the cache key must be
 * scoped to the authenticated user — otherwise two users who happen
 * to send the same Idempotency-Key would see each other's responses.
 *
 * - Safe methods (GET/HEAD/OPTIONS) are passed through.
 * - Unsafe methods without an Idempotency-Key are passed through
 *   (the key is optional, recommended for state-changing operations).
 * - If the key is present, the response is cached in Redis and
 *   replays are returned with the `Idempotent-Replay: true` header.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (SAFE_METHODS.includes(req.method)) {
      return next.handle();
    }

    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next.handle();
    }

    const key = req.headers[IDEMPOTENCY_HEADER] as string;
    if (!key) {
      return next.handle();
    }

    if (key.length < 16 || key.length > 255) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be between 16 and 255 characters',
      });
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be alphanumeric with hyphens/underscores',
      });
    }

    // Scope the key to the authenticated user. After guards run,
    // req.user.sub is populated by JwtAuthGuard.
    // If unauthenticated, use the raw Authorization header (or 'anon'
    // as a last resort) so two anonymous callers with the same key
    // can still collide — but that's acceptable because anon routes
    // (login, register) are exactly the ones you'd want to dedupe.
    const userId =
      (req.user as any)?.sub ||
      (req.headers.authorization
        ? `tok:${(req.headers.authorization as string).slice(0, 32)}`
        : 'anon');

    const cacheKey = `idempotency:${userId}:${key}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        res.setHeader('Idempotent-Replay', 'true');
        res.setHeader('X-Idempotency-Key', key);
        return of(parsed.body);
      } catch {
        // Corrupted cache, fall through and re-process
        await this.redisService.del(cacheKey);
      }
    }

    // Process the request, then cache the response if it's 2xx
    return next.handle().pipe(
      tap({
        next: (body) => {
          // Only cache successful responses; surface 4xx/5xx to the caller
          // (the request can be retried after fixing the input)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = JSON.stringify({ status: res.statusCode, body });
            this.redisService
              .set(cacheKey, data, IDEMPOTENCY_TTL)
              .catch((err) => {
                this.logger.error(
                  `Failed to cache idempotency response: ${err instanceof Error ? err.message : 'unknown'}`,
                );
              });
          }
        },
      }),
    );
  }
}
