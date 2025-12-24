import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const env = envSchema.parse(process.env);
