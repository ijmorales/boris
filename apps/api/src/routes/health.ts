import { db, sql } from '@boris/database';
import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  }),
);
