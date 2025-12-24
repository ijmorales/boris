import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export default defineConfig({
  schema: './src/schema/*',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
