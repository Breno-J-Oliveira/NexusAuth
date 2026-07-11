import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Trust proxy configuration (must be first)
  const configService = app.get(ConfigService);
  const proxyHops = configService.get<number>('TRUST_PROXY_HOPS', 1);
  app.set('trust proxy', proxyHops);

  // 2. Helmet — security headers (CSP, HSTS, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
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
          reportUri: process.env.CSP_REPORT_URI || '/api/csp-report',
        },
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      },
      crossOriginEmbedderPolicy: false,
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

  // 4. Cookie parser (for CSRF tokens)
  app.use(cookieParser());

  // 5. Security headers middleware (Permissions-Policy, etc.)
  const securityHeaders = app.get(SecurityHeadersMiddleware);
  app.use(securityHeaders.use.bind(securityHeaders));

  // 6. CSRF protection middleware
  const csrfMiddleware = app.get(CsrfMiddleware);
  app.use((req, res, next) => csrfMiddleware.use(req, res, next));

  // 7. Idempotency middleware
  const idempotencyMiddleware = app.get(IdempotencyMiddleware);
  app.use((req, res, next) => idempotencyMiddleware.use(req, res, next));

  // 8. CORS
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : (nodeEnv === 'development' ? true : false),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID', 'X-CSRF-Token', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID', 'Idempotent-Replay'],
    maxAge: 600, // 10 minutes
  });

  // 9. Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 10. Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 11. Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // 12. Graceful shutdown
  app.enableShutdownHooks();

  const prismaService = app.get(PrismaService);
  const redisService = app.get(RedisService);
  const logger = new Logger('Bootstrap');

  const handleShutdown = async (signal: string) => {
    logger.log(`Received ${signal}, closing connections...`);
    try {
      await prismaService.$disconnect();
      await redisService.onModuleDestroy();
      logger.log('All connections closed. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // 13. Swagger (development only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NexusAuth API')
      .setDescription('Microsserviço de autenticação centralizada — JWT RS256, 2FA, OAuth, multi-tenant, webhooks, API keys, LGPD')
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addApiKey(
        { type: 'apiKey', name: 'x-api-key', in: 'header' },
        'api-key',
      )
      .addCookieAuth('XSRF-TOKEN')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`NexusAuth API running on port ${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`Security: CSRF=${nodeEnv !== 'test'}, CSP report-only=${process.env.CSP_REPORT_ONLY === 'true'}, HSTS preload=true`);
}

bootstrap();
