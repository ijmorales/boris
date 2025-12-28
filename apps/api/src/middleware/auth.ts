import { getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Middleware that requires authentication for API routes.
 * Returns 401 JSON response if not authenticated (no redirect).
 * In development, bypasses auth if Clerk is not configured.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  // Check if Clerk is configured at runtime (allows tests to mock env)
  const isClerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  const isDev = process.env.NODE_ENV !== 'production';

  // Skip auth in development when Clerk is not configured
  if (!isClerkConfigured && isDev) {
    return next();
  }

  const auth = getAuth(req);

  if (!auth?.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  next();
};
