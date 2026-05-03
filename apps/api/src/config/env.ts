const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
const NODE_ENVS = ['development', 'test', 'staging', 'production'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];
export type NodeEnv = (typeof NODE_ENVS)[number];

export type AppEnv = {
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string | undefined;
  LOG_LEVEL: LogLevel;
  CORS_ORIGINS: string[];
  AUTH_SESSION_COOKIE_NAME: string;
  AUTH_SESSION_TTL_DAYS: number;
  AUTH_LOCK_MAX_ATTEMPTS: number;
  AUTH_LOCK_MINUTES: number;
  REDIS_ENABLED: boolean;
  REDIS_URL: string | undefined;
  REDIS_KEY_PREFIX: string;
};

type RawEnv = Record<string, unknown>;

export function validateEnv(config: RawEnv): AppEnv & RawEnv {
  const nodeEnv = parseNodeEnv(readString(config, 'NODE_ENV') ?? 'development');
  const port = parsePort(readString(config, 'PORT') ?? '3001');
  const databaseUrl = requireString(config, 'DATABASE_URL');
  const logLevel = parseLogLevel(
    readString(config, 'LOG_LEVEL') ?? (nodeEnv === 'development' ? 'debug' : 'info'),
  );
  const corsOrigins = parseCsv(
    readString(config, 'CORS_ORIGINS') ?? 'http://localhost:3000,http://127.0.0.1:3000',
  );
  const sessionCookieName = readString(config, 'AUTH_SESSION_COOKIE_NAME') ?? 'aic_session';
  const sessionTtlDays = parseInteger(
    readString(config, 'AUTH_SESSION_TTL_DAYS') ?? '7',
    'AUTH_SESSION_TTL_DAYS',
    1,
    30,
  );
  const authLockMaxAttempts = parseInteger(
    readString(config, 'AUTH_LOCK_MAX_ATTEMPTS') ?? '5',
    'AUTH_LOCK_MAX_ATTEMPTS',
    3,
    20,
  );
  const authLockMinutes = parseInteger(
    readString(config, 'AUTH_LOCK_MINUTES') ?? '15',
    'AUTH_LOCK_MINUTES',
    1,
    1440,
  );
  const redisEnabled = parseBoolean(readString(config, 'REDIS_ENABLED') ?? 'false');
  const redisUrl = readString(config, 'REDIS_URL');
  const redisKeyPrefix = readString(config, 'REDIS_KEY_PREFIX') ?? `aic:${nodeEnv}`;

  assertUrl(databaseUrl, 'DATABASE_URL');

  if (redisEnabled && !redisUrl) {
    throw new Error('REDIS_URL is required when REDIS_ENABLED=true.');
  }

  if (redisUrl) {
    assertUrl(redisUrl, 'REDIS_URL');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: readString(config, 'JWT_SECRET'),
    LOG_LEVEL: logLevel,
    CORS_ORIGINS: corsOrigins,
    AUTH_SESSION_COOKIE_NAME: sessionCookieName,
    AUTH_SESSION_TTL_DAYS: sessionTtlDays,
    AUTH_LOCK_MAX_ATTEMPTS: authLockMaxAttempts,
    AUTH_LOCK_MINUTES: authLockMinutes,
    REDIS_ENABLED: redisEnabled,
    REDIS_URL: redisUrl,
    REDIS_KEY_PREFIX: redisKeyPrefix,
  };
}

function readString(config: RawEnv, key: string): string | undefined {
  const value = config[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireString(config: RawEnv, key: string): string {
  const value = readString(config, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function parsePort(value: string): number {
  return parseInteger(value, 'PORT', 1, 65535);
}

function parseInteger(value: string, key: string, min: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

function parseBoolean(value: string): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error('Boolean env values must be either "true" or "false".');
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseLogLevel(value: string): LogLevel {
  if (LOG_LEVELS.includes(value as LogLevel)) {
    return value as LogLevel;
  }

  throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}.`);
}

function parseNodeEnv(value: string): NodeEnv {
  if (NODE_ENVS.includes(value as NodeEnv)) {
    return value as NodeEnv;
  }

  throw new Error(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}.`);
}

function assertUrl(value: string, key: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}
