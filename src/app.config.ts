import {
  INestApplication,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

/**
 * App configuration shared by main.ts and the E2E test suite.
 *
 * Extracted from bootstrap() so the test harness applies the EXACT
 * same middleware/pipe/filter stack as production. Without this,
 * tests passed against a half-configured app and never exercised
 * Helmet, CORS, CSRF, Idempotency, ValidationPipe, etc.
 */
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const logger = new Logger('AppConfig');

  // 1. Trust proxy configuration (must be first)
  const proxyHops = configService.get<number>('TRUST_PROXY_HOPS', 1);
  if ((app.getHttpAdapter().getInstance() as any).set) {
    (app.getHttpAdapter().getInstance() as any).set('trust proxy', proxyHops);
  }

  // 2. Helmet â€” security headers (CSP, HSTS, etc.)
  // V7/V37 (HSTS 2y), CSP tightened where possible
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Swagger UI in development still requires unsafe-inline + unsafe-eval.
          // In production, /docs is disabled (see main.ts), so this only matters
          // for dev. If you need stricter CSP in dev, set DISABLE_DOCS=true.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: {},
      noSniff: {},
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: {},
    }),
  );

  // 3. Body parser with size limit
  const bodyLimit = configService.get<string>('REQUEST_BODY_LIMIT', '100kb');
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // 4. Cookie parser â€” kept for future cookie-based flows and for
  //    any future SameSite=Strict + CSRF strategy. This API today
  //    authenticates exclusively via Authorization: Bearer, so cookies
  //    carry NO auth state.
  app.use(cookieParser());

  // 5. Security headers middleware (Permissions-Policy, Clear-Site-Data)
  const securityHeaders = app.get(SecurityHeadersMiddleware);
  app.use(securityHeaders.use.bind(securityHeaders));

  // NOTE on CSRF: This API is Bearer-token-only. The browser does NOT
  // auto-attach Authorization headers cross-origin, and there are no
  // session cookies that could be replayed via a CSRF-style attack.
  // Therefore classic CSRF (double-submit cookie, synchronizer
  // token) does not apply. If/when a cookie-based flow is added
  // (e.g. a refresh token in an HttpOnly cookie), a CSRF strategy
  // MUST be added at that point.

  // 6. CORS
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (corsOrigins.length > 0 ? corsOrigins : (nodeEnv === 'development' ? true : false)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-ID', 'Idempotent-Replay'],
    maxAge: 600,
  });

  // 7. Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 8. Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 9. Global interceptors
  // Idempotency must run AFTER auth (interceptors execute after guards),
  // so the per-user cache key can include req.user.sub.
  app.useGlobalInterceptors(new LoggingInterceptor());
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
  app.useGlobalInterceptors(app.get(IdempotencyInterceptor));

  // 10. Graceful shutdown
  app.enableShutdownHooks();

  logger.log('App configured: Helmet, CORS, ValidationPipe, filters, interceptors');
}
