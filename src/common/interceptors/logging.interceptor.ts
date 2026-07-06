import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let correlationId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.headers['x-request-id'] = correlationId;
    res.setHeader('x-request-id', correlationId);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          logger.info({
            correlationId,
            method: req.method,
            path: req.url,
            statusCode: res.statusCode,
            durationMs: duration,
          });
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          logger.error({
            correlationId,
            method: req.method,
            path: req.url,
            statusCode: err.status || 500,
            durationMs: duration,
            error: err.message,
          });
        },
      }),
    );
  }
}
