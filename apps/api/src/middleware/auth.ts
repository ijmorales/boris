import { getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Middleware that requires authentication for API routes.
 * Returns 401 JSON response if not authenticated (no redirect).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  next();
};
