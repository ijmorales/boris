import { closeDatabase } from '@boris/database';
import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/users', usersRouter);

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.close();
  await closeDatabase();
  process.exit(0);
});
