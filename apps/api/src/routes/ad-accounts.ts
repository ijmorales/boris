import {
  getAccountById,
  getAccountsWithSpending,
  getObjectsWithSpending,
} from '@boris/database';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

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
    );

    res.json({ data: accounts });
  }),
);

// GET /api/ad-accounts/:accountId/objects
adAccountsRouter.get(
  '/:accountId/objects',
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

    // Check account exists
    const account = await getAccountById(accountIdResult.data);
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
