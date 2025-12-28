import { z } from 'zod';

const isDev = process.env.NODE_ENV !== 'production';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // Clerk keys are required in production, optional in development
  CLERK_SECRET_KEY: isDev
    ? z.string().optional()
    : z.string().min(1, 'CLERK_SECRET_KEY is required in production'),
  CLERK_PUBLISHABLE_KEY: isDev
    ? z.string().optional()
    : z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required in production'),
});

export const env = envSchema.parse(process.env);
