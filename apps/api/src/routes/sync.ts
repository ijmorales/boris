import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import { queue } from '../lib/queue.js';

export const syncRouter = Router();

const startSyncSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// POST /api/sync - Start a Meta Ads sync job
syncRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = startSyncSchema.safeParse(req.body);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const error of result.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Validation failed', details);
    }

    const { startDate, endDate } = result.data;

    const job = await queue.addJob('sync_meta_ads', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    res.status(202).json({
      data: {
        jobId: job.id,
      },
    });
  }),
);
