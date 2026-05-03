import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type RedisStatus = {
  enabled: boolean;
  status: 'disabled' | 'available' | 'unavailable';
  error?: string;
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private status: RedisStatus = {
    enabled: false,
    status: 'disabled',
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>('REDIS_ENABLED', false);

    if (!enabled) {
      this.status = { enabled: false, status: 'disabled' };
      return;
    }

    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const keyPrefix = this.configService.get<string>('REDIS_KEY_PREFIX', 'aic:dev');
    const client = new Redis(redisUrl, {
      connectTimeout: 1_000,
      enableOfflineQueue: false,
      keyPrefix: `${keyPrefix}:`,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    try {
      await client.connect();
      await client.ping();
      this.client = client;
      this.status = { enabled: true, status: 'available' };
      this.logger.log('Redis is available.');
    } catch (error) {
      client.disconnect();
      const message = error instanceof Error ? error.message : 'Unknown Redis connection error.';
      this.status = { enabled: true, status: 'unavailable', error: message };
      this.logger.warn(
        `Redis is unavailable. Cache-only reads must fall back to source of truth. ${message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.quit();
    this.client = null;
  }

  getClient(): Redis | null {
    return this.status.status === 'available' ? this.client : null;
  }

  getStatus(): RedisStatus {
    return this.status;
  }
}
