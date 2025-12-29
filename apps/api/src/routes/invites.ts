import { and, db, eq, invites } from '@boris/database';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireOrgMember } from '../middleware/auth.js';

export const invitesRouter = Router();

const createInviteSchema = z.object({
  email: z.string().email(),
  isAdmin: z.boolean().optional().default(false),
});

// GET /api/invites - List pending invites for the organization
invitesRouter.get(
  '/',
  requireOrgMember({ adminOnly: true }),
  asyncHandler(async (req, res) => {
    const result = await db.query.invites.findMany({
      where: eq(invites.organizationId, req.organization!.id),
      with: {
        invitedBy: {
          columns: { id: true, clerkId: true },
        },
      },
      orderBy: (invites, { desc }) => [desc(invites.createdAt)],
    });

    res.json({ data: result });
  }),
);

// POST /api/invites - Create an invite
invitesRouter.post(
  '/',
  requireOrgMember({ adminOnly: true }),
  asyncHandler(async (req, res) => {
    const parseResult = createInviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const error of parseResult.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid invite data', details);
    }

    const { email, isAdmin } = parseResult.data;

    // Check if invite already exists for this email in this org
    const existing = await db.query.invites.findFirst({
      where: and(
        eq(invites.email, email.toLowerCase()),
        eq(invites.organizationId, req.organization!.id),
      ),
    });

    if (existing) {
      throw new ValidationError('Invite already exists', {
        email: ['An invite for this email already exists'],
      });
    }

    const [invite] = await db
      .insert(invites)
      .values({
        email: email.toLowerCase(),
        organizationId: req.organization!.id,
        isAdmin,
        invitedById: req.user!.id,
      })
      .returning();

    res.status(201).json({ data: invite });
  }),
);

// DELETE /api/invites/:id - Revoke an invite
invitesRouter.delete(
  '/:id',
  requireOrgMember({ adminOnly: true }),
  asyncHandler(async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      throw new ValidationError('Invalid invite ID', {
        id: ['Must be a valid UUID'],
      });
    }

    const result = await db
      .delete(invites)
      .where(
        and(
          eq(invites.id, idResult.data),
          eq(invites.organizationId, req.organization!.id),
        ),
      )
      .returning({ id: invites.id });

    if (result.length === 0) {
      throw new NotFoundError('Invite not found');
    }

    res.status(204).send();
  }),
);
