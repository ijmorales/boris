import type { Task } from 'graphile-worker';
import { z } from 'zod';
import { MetaSyncer } from '../services/meta-syncer.js';

const syncMetaAdsPayloadSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const syncMetaAds: Task = async (payload, helpers) => {
  const result = syncMetaAdsPayloadSchema.safeParse(payload);

  if (!result.success) {
    helpers.logger.error(`Invalid payload: ${result.error.message}`);
    throw new Error(`Invalid sync_meta_ads payload: ${result.error.message}`);
  }

  const { startDate, endDate } = result.data;

  helpers.logger.info(
    `Starting Meta Ads sync for ${startDate.toISOString()} to ${endDate.toISOString()}`,
  );

  const syncer = new MetaSyncer();
  await syncer.sync(startDate, endDate);

  helpers.logger.info('Meta Ads sync completed successfully');
};
