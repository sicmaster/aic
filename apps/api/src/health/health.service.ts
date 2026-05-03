import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.constants';
import { RedisService, type RedisStatus } from '../redis/redis.service';

type DependencyStatus = {
  status: 'available' | 'unavailable';
  latencyMs?: number;
  error?: string;
};

export type HealthStatus = {
  service: string;
  status: 'ok' | 'degraded';
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
    redis: RedisStatus;
  };
};

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_POOL) private readonly databasePool: Pool,
    private readonly redisService: RedisService,
  ) {}

  async getStatus(): Promise<HealthStatus> {
    const database = await this.getDatabaseStatus();
    const redis = this.redisService.getStatus();
    const status =
      database.status === 'available' && redis.status !== 'unavailable' ? 'ok' : 'degraded';

    return {
      service: 'aic-api',
      status,
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        redis,
      },
    };
  }

  private async getDatabaseStatus(): Promise<DependencyStatus> {
    const start = Date.now();

    try {
      await this.databasePool.query('select 1');

      return {
        status: 'available',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unavailable',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown database health error.',
      };
    }
  }
}
