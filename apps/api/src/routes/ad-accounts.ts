import {
  adAccounts,
  clients,
  db,
  eq,
  getAccountById,
  getAccountsWithSpending,
  getObjectsWithSpending,
} from '@boris/database';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireOrgMember } from '../middleware/auth.js';

export const adAccountsRouter = Router();

const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const uuidSchema = z.string().uuid();

// GET /api/ad-accounts
adAccountsRouter.get(
  '/',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    const result = dateRangeSchema.safeParse(req.query);
    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const error of result.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid date range', details);
    }

    const accounts = await getAccountsWithSpending(
      result.data.startDate,
      result.data.endDate,
      req.organization!.id,
    );

    res.json({ data: accounts });
  }),
);

// GET /api/ad-accounts/:accountId/objects
adAccountsRouter.get(
  '/:accountId/objects',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    // Validate accountId path param
    const accountIdResult = uuidSchema.safeParse(req.params.accountId);
    if (!accountIdResult.success) {
      throw new ValidationError('Invalid account ID', {
        accountId: ['Must be a valid UUID'],
      });
    }

    const querySchema = dateRangeSchema.merge(paginationSchema).extend({
      parentId: z.string().uuid().nullish(),
    });

    const result = querySchema.safeParse(req.query);
    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const error of result.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid query params', details);
    }

    // Check account exists and belongs to organization
    const account = await getAccountById(
      accountIdResult.data,
      req.organization!.id,
    );
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const paginatedResult = await getObjectsWithSpending(
      accountIdResult.data,
      result.data.parentId ?? null,
      result.data.startDate,
      result.data.endDate,
      { limit: result.data.limit, offset: result.data.offset },
    );

    res.json({
      data: paginatedResult.data,
      pagination: paginatedResult.pagination,
      meta: {
        account: {
          id: account.id,
          name: account.name,
          platform: account.platform,
        },
      },
    });
  }),
);

const updateAccountSchema = z.object({
  clientId: z.string().uuid().nullable(),
});

// PATCH /api/ad-accounts/:accountId
adAccountsRouter.patch(
  '/:accountId',
  asyncHandler(async (req, res) => {
    const accountIdResult = uuidSchema.safeParse(req.params.accountId);
    if (!accountIdResult.success) {
      throw new ValidationError('Invalid account ID', {
        accountId: ['Must be a valid UUID'],
      });
    }

    const parseResult = updateAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const error of parseResult.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Invalid account data', details);
    }

    const { clientId } = parseResult.data;

    // Validate client exists if clientId is provided
    if (clientId !== null) {
      const clientExists = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (clientExists.length === 0) {
        throw new NotFoundError('Client not found');
      }
    }

    const [account] = await db
      .update(adAccounts)
      .set({ clientId, updatedAt: new Date() })
      .where(eq(adAccounts.id, accountIdResult.data))
      .returning();

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    res.json({ data: account });
  }),
);
