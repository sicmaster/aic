import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE, DATABASE_POOL } from './database.constants';
import * as schema from './schema';

export const databasePoolProvider: Provider<Pool> = {
  provide: DATABASE_POOL,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');

    return new Pool({
      connectionString,
      connectionTimeoutMillis: 1_000,
    });
  },
};

export const databaseProvider: Provider = {
  provide: DATABASE,
  inject: [DATABASE_POOL],
  useFactory: (pool: Pool) => {
    return drizzle(pool, { schema });
  },
};
