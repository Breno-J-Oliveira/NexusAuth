import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const CSRF_EXEMPT_PATHS = [
  '/auth/google',
  '/auth/google/callback',
  '/auth/github',
  '/auth/github/callback',
  '/webhooks/test',
  '/health',
];

/**
 * CSRF Protection using double-submit cookie pattern.
 *
 * - For safe methods (GET/HEAD/OPTIONS), emit a CSRF token cookie if missing.
 * - For unsafe methods (POST/PUT/PATCH/DELETE), require the token in
 *   the X-CSRF-Token header to match the XSRF-TOKEN cookie value.
 *
 * The cookie is set with SameSite=Strict so browsers will not include
 * it on cross-site requests, providing additional defense.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for exempt paths
    if (CSRF_EXEMPT_PATHS.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Skip CSRF for API key authenticated requests (server-to-server)
    if (req.headers['x-api-key']) {
      return next();
    }

    if (SAFE_METHODS.includes(req.method)) {
      if (!req.cookies?.[CSRF_COOKIE]) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE, token, {
          httpOnly: false, // JS needs to read
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }
      return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = (req.headers[CSRF_HEADER] as string) || '';

    if (!cookieToken || !headerToken) {
      throw new BadRequestException({
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token missing. Include X-CSRF-Token header.',
      });
    }

    if (
      cookieToken.length !== headerToken.length ||
      !crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken),
      )
    ) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token does not match',
      });
    }

    next();
  }
}
