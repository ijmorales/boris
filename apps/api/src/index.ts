import 'dotenv/config';
import { closeDatabase } from '@boris/database';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { adAccountsRouter } from './routes/ad-accounts.js';
import { clientsRouter } from './routes/clients.js';
import { healthRouter } from './routes/health.js';
import { syncRouter } from './routes/sync.js';

const app = express();

// CORS must include credentials for session cookies
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check BEFORE Clerk middleware (always accessible)
app.use('/health', healthRouter);

// Clerk middleware attaches auth to all subsequent requests
app.use(clerkMiddleware());

// Protected routes
app.use('/api/ad-accounts', requireAuth, adAccountsRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/sync', requireAuth, syncRouter);

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
