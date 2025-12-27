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
    // biome-ignore lint/suspicious/noExplicitAny: graphile-worker types incompatible
    const job = await utils.addJob(taskIdentifier, payload as any);
    return { id: String(job.id) };
  },

  async addJobs<T extends JobName>(
    jobs: Array<{ taskIdentifier: T; payload: JobPayloads[T] }>,
  ): Promise<{ ids: string[] }> {
    const utils = await getWorkerUtils();
    const ids: string[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = await utils.addJob(
        jobs[i].taskIdentifier,
        // biome-ignore lint/suspicious/noExplicitAny: graphile-worker types incompatible
        jobs[i].payload as any,
        { priority: i },
      );
      ids.push(String(job.id));
    }

    return { ids };
  },

  async release(): Promise<void> {
    if (workerUtils) {
      await workerUtils.release();
      workerUtils = null;
    }
  },
};
