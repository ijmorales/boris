import { makeWorkerUtils, type WorkerUtils } from 'graphile-worker';
import { env } from './env.js';

let workerUtils: WorkerUtils | null = null;

async function getWorkerUtils(): Promise<WorkerUtils> {
  if (!workerUtils) {
    workerUtils = await makeWorkerUtils({
      connectionString: env.DATABASE_URL,
    });
  }
  return workerUtils;
}

export interface SyncMetaAdsPayload {
  startDate: string;
  endDate: string;
}

type JobPayloads = {
  sync_meta_ads: SyncMetaAdsPayload;
};

type JobName = keyof JobPayloads;

export const queue = {
  async addJob<T extends JobName>(
    taskIdentifier: T,
    payload: JobPayloads[T],
  ): Promise<{ id: string }> {
    const utils = await getWorkerUtils();
    const job = await utils.addJob(taskIdentifier, payload);
    return { id: String(job.id) };
  },

  async release(): Promise<void> {
    if (workerUtils) {
      await workerUtils.release();
      workerUtils = null;
    }
  },
};
