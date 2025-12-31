import 'dotenv/config';
import { closeDatabase } from '@boris/database';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { adAccountsRouter } from './routes/ad-accounts.js';
import { clientsRouter } from './routes/clients.js';
import { healthRouter } from './routes/health.js';
import { invitesRouter } from './routes/invites.js';
import { organizationsRouter } from './routes/organizations.js';
import { syncRouter } from './routes/sync.js';
import { usersRouter } from './routes/users.js';
import { webhooksRouter } from './routes/webhooks.js';

const app = express();

// CORS must include credentials for session cookies
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Webhooks MUST come before express.json() - they need raw body for signature verification
app.use('/api/webhooks', webhooksRouter);

app.use(express.json());

// Health check BEFORE Clerk middleware (always accessible)
app.use('/health', healthRouter);

// Clerk middleware attaches auth to all subsequent requests
app.use(clerkMiddleware());

// Protected routes (auth is handled by each router's middleware)
app.use('/api/ad-accounts', adAccountsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/users', usersRouter);
app.use('/api/organizations', organizationsRouter);

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
