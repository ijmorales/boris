import type { TaskList } from 'graphile-worker';
import { sendEmail } from './send-email.js';
import { syncMetaAds } from './sync-meta-ads.js';

export const tasks: TaskList = {
  send_email: sendEmail,
  sync_meta_ads: syncMetaAds,
};
