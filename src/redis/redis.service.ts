import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CircuitBreaker, CircuitBreakerOpenError } from '../common/utils/circuit-breaker.util';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  // RESILIENCE: Circuit breaker to prevent cascading failures when Redis is unavailable
  private readonly circuitBreaker = new CircuitBreaker('RedisService', {
    failureThreshold: 5,
    resetTimeoutMs: 30_000, // 30s
    halfOpenMaxRequests: 3,
  });

  // SECURITY: Maximum key length to prevent memory attacks
  private readonly MAX_KEY_LENGTH = 1024;
  // SECURITY: Maximum value length to prevent memory attacks
  private readonly MAX_VALUE_LENGTH = 1024 * 1024; // 1MB

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000); // Exponential backoff capped at 2s
      },
    });
    
    // SECURITY: Log connection errors
    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  /**
   * Execute an operation with circuit breaker protection.
   * If Redis is in circuit-breaker OPEN state, the operation fails immediately
   * instead of hanging on a dead connection.
   */
  private async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await this.circuitBreaker.execute(operation, fallback);
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        this.logger.warn(`Redis operation rejected by circuit breaker`);
      }
      throw err;
    }
  }

  /**
   * Get the circuit breaker state for health checks / metrics.
   */
  getCircuitState(): string {
    return this.circuitBreaker.currentState;
  }

  isCircuitOpen(): boolean {
    return this.circuitBreaker.isOpen;
  }

  forceCloseCircuit(): void {
    this.circuitBreaker.forceClose();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // SECURITY: Validate key format
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Redis key must be a non-empty string');
    }
    if (key.length > this.MAX_KEY_LENGTH) {
      throw new Error(`Redis key exceeds maximum length of ${this.MAX_KEY_LENGTH}`);
    }
    // SECURITY: Prevent null bytes in keys
    if (key.includes('\0')) {
      throw new Error('Redis key contains invalid characters');
    }
  }

  // SECURITY: Validate value format
  private validateValue(value: string): void {
    if (value === undefined || value === null) {
      throw new Error('Redis value cannot be null or undefined');
    }
    if (typeof value !== 'string') {
      throw new Error('Redis value must be a string');
    }
    if (value.length > this.MAX_VALUE_LENGTH) {
      throw new Error(`Redis value exceeds maximum length of ${this.MAX_VALUE_LENGTH}`);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    
    // SECURITY: Validate TTL
    if (ttlSeconds !== undefined && (typeof ttlSeconds !== 'number' || ttlSeconds < 0)) {
      throw new Error('TTL must be a non-negative number');
    }
    
    await this.withCircuitBreaker(async () => {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    });
  }

  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    this.validateKey(key);
    this.validateValue(value);
    
    if (ttlSeconds !== undefined && (typeof ttlSeconds !== 'number' || ttlSeconds < 0)) {
      throw new Error('TTL must be a non-negative number');
    }
    
    return this.withCircuitBreaker(async () => {
      if (ttlSeconds && ttlSeconds > 0) {
        const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } else {
        const result = await this.client.set(key, value, 'NX');
        return result === 'OK';
      }
    });
  }

  async get(key: string): Promise<string | null> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      () => this.client.get(key),
      () => null, // Fallback: return null as if key doesn't exist (degraded mode)
    );
  }

  async del(key: string): Promise<void> {
    this.validateKey(key);
    await this.withCircuitBreaker(() => this.client.del(key));
  }

  async exists(key: string): Promise<boolean> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      async () => {
        const result = await this.client.exists(key);
        return result === 1;
      },
      () => false, // Fallback: assume key doesn't exist (degraded mode)
    );
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async incr(key: string): Promise<number> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      () => this.client.incr(key),
      () => 0, // Fallback: return 0 so rate limiting degrades to allow
    );
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    this.validateKey(key);
    
    // SECURITY: Validate TTL
    if (typeof ttlSeconds !== 'number' || ttlSeconds < 0) {
      throw new Error('TTL must be a non-negative number');
    }
    
    await this.withCircuitBreaker(() => this.client.expire(key, ttlSeconds));
  }

  async ttl(key: string): Promise<number> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      () => this.client.ttl(key),
      () => -2, // Fallback: -2 means key doesn't exist
    );
  }

  // SECURITY: flushall is extremely dangerous - require explicit confirmation
  // This method should NEVER be called in production without explicit admin action
  async flushall(confirmationToken?: string): Promise<void> {
    const nodeEnv = process.env.NODE_ENV;
    
    // SECURITY: Block flushall in production unless explicitly confirmed
    if (nodeEnv === 'production') {
      const expectedToken = process.env.REDIS_FLUSH_TOKEN;
      if (!expectedToken) {
        throw new Error('FLUSHALL is disabled in production. Set REDIS_FLUSH_TOKEN to enable.');
      }
      if (confirmationToken !== expectedToken) {
        this.logger.warn('Unauthorized FLUSHALL attempt blocked in production');
        throw new Error('Invalid flushall confirmation token');
      }
    }
    
    this.logger.warn(`FLUSHALL executed in ${nodeEnv} environment - ALL DATA DELETED`);
    await this.client.flushall();
  }
}
