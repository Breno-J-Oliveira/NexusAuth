import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS configurável via env — fail-closed em produção
  const configService = app.get(ConfigService);

  // M2 fix: Configure trust proxy for rate limiting behind reverse proxy
  // Set to the number of trusted proxy hops (typically 1 for nginx/ALB/Cloudflare)
  // This must be configured based on actual deployment topology
  const proxyHops = configService.get<number>('TRUST_PROXY_HOPS', 1);
  app.set('trust proxy', proxyHops);
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
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter (standardized error format)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global logging interceptor (Pino + correlation ID)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global metrics interceptor (Prometheus HTTP metrics)
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Graceful shutdown
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

  // Swagger / OpenAPI — disabled in production
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NexusAuth API')
      .setDescription('Microsserviço de autenticação centralizada — JWT RS256, 2FA, OAuth, multi-tenant, webhooks, API keys')
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addApiKey(
        { type: 'apiKey', name: 'x-api-key', in: 'header' },
        'api-key',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`NexusAuth API running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
