import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import { queue } from '../lib/queue.js';

export const syncRouter = Router();

const startSyncSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  });

/**
 * Generates monthly date ranges between start and end dates.
 * Uses UTC methods to avoid timezone issues.
 */
function generateMonthlyDateRanges(
  startDate: Date,
  endDate: Date,
): Array<{ startDate: string; endDate: string }> {
  const ranges: Array<{ startDate: string; endDate: string }> = [];

  // Work in UTC to avoid timezone issues
  let currentYear = startDate.getUTCFullYear();
  let currentMonth = startDate.getUTCMonth();
  let currentDay = startDate.getUTCDate();

  const endTime = endDate.getTime();

  while (true) {
    // Month start: either the original start date or the 1st of the month
    const monthStart = new Date(
      Date.UTC(currentYear, currentMonth, currentDay),
    );

    // Month end: last day of the current month
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));

    // Use the earlier of: last day of month or the end date
    const chunkEnd =
      lastDayOfMonth.getTime() > endTime ? endDate : lastDayOfMonth;

    ranges.push({
      startDate: monthStart.toISOString().split('T')[0],
      endDate: chunkEnd.toISOString().split('T')[0],
    });

    // If we've reached or passed the end date, stop
    if (chunkEnd.getTime() >= endTime) {
      break;
    }

    // Move to the 1st of the next month
    currentMonth += 1;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    currentDay = 1;
  }

  return ranges;
}

// POST /api/sync - Start Meta Ads sync jobs (chunked by month)
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

    // Chunk the date range into monthly jobs
    const dateRanges = generateMonthlyDateRanges(startDate, endDate);

    const jobs = dateRanges.map((range) => ({
      taskIdentifier: 'sync_meta_ads' as const,
      payload: {
        startDate: range.startDate,
        endDate: range.endDate,
      },
    }));

    const { ids } = await queue.addJobs(jobs);

    res.status(202).json({
      data: {
        jobIds: ids,
        chunks: dateRanges.length,
      },
    });
  }),
);
