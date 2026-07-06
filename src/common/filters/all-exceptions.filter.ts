import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string) || exception.message;

        if (r.code) {
          code = r.code as string;
        } else if (Array.isArray(r.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = r;
        } else if (r.errors) {
          code = 'VALIDATION_ERROR';
          details = r.errors;
        }

        if (r.details) {
          details = r.details;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const correlationId = request.headers['x-request-id'] as string;

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          correlationId,
          statusCode,
          code,
          message,
          path: request.url,
          method: request.method,
        }),
      );
    }

    const body: Record<string, unknown> = { code, message, statusCode };
    if (details) body['details'] = details;
    if (correlationId) body['correlationId'] = correlationId;

    response.status(statusCode).json(body);
  }
}
