import { adAccounts, and, clients, db, eq, sql } from '@boris/database';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireOrgMember } from '../middleware/auth.js';

export const clientsRouter = Router();

const createClientSchema = z.object({
  name: z.string().min(1).max(255),
});

const updateClientSchema = z.object({
  name: z.string().min(1).max(255),
});

// GET /api/clients
clientsRouter.get(
  '/',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const result = await db
      .select({
        id: clients.id,
        name: clients.name,
        accountCount: sql<number>`count(${adAccounts.id})::int`,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .leftJoin(adAccounts, eq(clients.id, adAccounts.clientId))
      .where(eq(clients.organizationId, req.organization!.id))
      .groupBy(clients.id)
      .orderBy(clients.name);

    res.json({ data: result });
  }),
);

// GET /api/clients/:id
clientsRouter.get(
  '/:id',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      throw new ValidationError('Invalid client ID', {
        id: ['Must be a valid UUID'],
      });
    }

    const result = await db
      .select({
        id: clients.id,
        name: clients.name,
        accountCount: sql<number>`count(${adAccounts.id})::int`,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .leftJoin(adAccounts, eq(clients.id, adAccounts.clientId))
      .where(
        and(
          eq(clients.id, idResult.data),
          eq(clients.organizationId, req.organization!.id),
        ),
      )
      .groupBy(clients.id);

    if (result.length === 0) {
      throw new NotFoundError('Client not found');
    }

    res.json({ data: result[0] });
  }),
);

// POST /api/clients
clientsRouter.post(
  '/',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const parseResult = createClientSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const error of parseResult.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid client data', details);
    }

    const { name } = parseResult.data;

    const [client] = await db
      .insert(clients)
      .values({ name, organizationId: req.organization!.id })
      .returning();

    res.status(201).json({ data: client });
  }),
);

// PATCH /api/clients/:id
clientsRouter.patch(
  '/:id',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      throw new ValidationError('Invalid client ID', {
        id: ['Must be a valid UUID'],
      });
    }

    const parseResult = updateClientSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const error of parseResult.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid client data', details);
    }

    const { name } = parseResult.data;

    const [client] = await db
      .update(clients)
      .set({ name, updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, idResult.data),
          eq(clients.organizationId, req.organization!.id),
        ),
      )
      .returning();

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    res.json({ data: client });
  }),
);

// DELETE /api/clients/:id
clientsRouter.delete(
  '/:id',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      throw new ValidationError('Invalid client ID', {
        id: ['Must be a valid UUID'],
      });
    }

    const result = await db
      .delete(clients)
      .where(
        and(
          eq(clients.id, idResult.data),
          eq(clients.organizationId, req.organization!.id),
        ),
      )
      .returning({ id: clients.id });

    if (result.length === 0) {
      throw new NotFoundError('Client not found');
    }

    res.status(204).send();
  }),
);
