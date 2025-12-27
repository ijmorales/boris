import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  META_ADS_TOKEN: z.string().min(1, 'META_ADS_TOKEN is required'),
});

export const env = envSchema.parse(process.env);
