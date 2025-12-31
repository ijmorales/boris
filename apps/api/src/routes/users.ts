import { and, db, eq, invites, users } from '@boris/database';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { requireOrgMember } from '../middleware/auth.js';

export const usersRouter = Router();

// GET /api/users - List users and pending invites in the organization
usersRouter.get(
  '/',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const [orgUsers, pendingInvites] = await Promise.all([
      db.query.users.findMany({
        where: eq(users.organizationId, req.organization!.id),
        columns: {
          id: true,
          clerkId: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
      db.query.invites.findMany({
        where: eq(invites.organizationId, req.organization!.id),
        columns: {
          id: true,
          email: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      data: {
        users: orgUsers,
        invites: pendingInvites,
      },
    });
  }),
);

const updateUserSchema = z.object({
  isAdmin: z.boolean(),
});

// PATCH /api/users/:id - Update user role (admin only)
usersRouter.patch(
  '/:id',
  requireOrgMember({ adminOnly: true }),
  asyncHandler(async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      throw new ValidationError('Invalid user ID', {
        id: ['Must be a valid UUID'],
      });
    }

    // Prevent self-demotion
    if (idResult.data === req.user!.id) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const error of parseResult.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid user data', details);
    }

    const { isAdmin } = parseResult.data;

    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(
        and(
          eq(users.id, idResult.data),
          eq(users.organizationId, req.organization!.id),
        ),
      )
      .returning();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({ data: user });
  }),
);

// DELETE /api/users/:id - Remove user from organization (admin only)
usersRouter.delete(
  '/:id',
  requireOrgMember({ adminOnly: true }),
  asyncHandler(async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      throw new ValidationError('Invalid user ID', {
        id: ['Must be a valid UUID'],
      });
    }

    // Prevent self-removal
    if (idResult.data === req.user!.id) {
      throw new ForbiddenError('Cannot remove yourself from organization');
    }

    // Set organizationId to null instead of deleting the user
    const [user] = await db
      .update(users)
      .set({ organizationId: null, isAdmin: false })
      .where(
        and(
          eq(users.id, idResult.data),
          eq(users.organizationId, req.organization!.id),
        ),
      )
      .returning({ id: users.id });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(204).send();
  }),
);
