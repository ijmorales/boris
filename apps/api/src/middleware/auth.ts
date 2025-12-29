import { db } from '@boris/database';
import { users } from '@boris/database/schema';
import { getAuth } from '@clerk/express';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

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

/**
 * Combined middleware: authenticates, loads user + org context, optionally requires admin.
 */
export function requireOrgMember(
  options: { adminOnly?: boolean } = {},
): RequestHandler {
  return async (req, _res, next) => {
    const auth = getAuth(req);
    if (!auth?.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.organizationId || !user.organization) {
      throw new ForbiddenError('No organization access');
    }

    if (options.adminOnly && !user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      isAdmin: user.isAdmin,
    };

    req.organization = {
      id: user.organization.id,
      name: user.organization.name,
    };

    next();
  };
}
