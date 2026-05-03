import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001/api'),
  NEXT_PUBLIC_APP_BASE_PATH: z.string().default(''),
  NEXT_PUBLIC_LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error', 'fatal'])
    .default(process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_BASE_PATH: process.env.NEXT_PUBLIC_APP_BASE_PATH,
  NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
});
