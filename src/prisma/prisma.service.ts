import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // V56 FIX: helper to convert Prisma errors to safe HTTP exceptions
  static isPrismaKnownError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
    return err instanceof Prisma.PrismaClientKnownRequestError;
  }

  static isPrismaValidationError(err: unknown): err is Prisma.PrismaClientValidationError {
    return err instanceof Prisma.PrismaClientValidationError;
  }

  // Map a Prisma error code to a safe message
  static safePrismaMessage(err: unknown): string {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          return 'Resource already exists';
        case 'P2025':
          return 'Resource not found';
        case 'P2003':
          return 'Foreign key constraint failed';
        default:
          return 'Database operation failed';
      }
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      return 'Invalid data provided';
    }
    return 'Database operation failed';
  }
}
