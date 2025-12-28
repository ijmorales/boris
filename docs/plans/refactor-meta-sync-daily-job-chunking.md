# feat: Refactor Meta Sync to Chunk Date Ranges into Daily Jobs

## Overview

Refactor the Meta Ads sync process so instead of enqueuing 1 big job for an entire date range, the system chunks it into daily jobs and enqueues them atomically in a transaction. This prevents API timeouts for large date ranges and enables better rate limit management.

**Example**: User syncs a year → 365 daily jobs are enqueued, processed with controlled concurrency.

## Problem Statement

Current implementation (`apps/worker/src/services/meta-syncer.ts:37-84`) sends the entire date range to Meta's API in a single job. For large ranges (e.g., 2 years), this causes:

1. **API timeouts** - Meta needs to compute all data server-side before returning page 1
2. **No granular retry** - If the job fails, the entire range must be re-synced
3. **No rate limit control** - Can't throttle requests to stay within Meta's limits

## Proposed Solution

### Architecture

```
POST /api/sync {startDate, endDate}
         │
         ▼
┌─────────────────────────────────────┐
│  API: Chunk into daily date ranges  │
│  (Jan 1-31 → 31 jobs)               │
└─────────────────────────────────────┘
         │
         ▼ (atomic transaction)
┌─────────────────────────────────────┐
│  graphile_worker.add_jobs([...])    │
│  All 31 jobs enqueued or none       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Worker: queueName="meta_sync"      │
│  Serial execution (1 at a time)     │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Daily chunks** - Each job syncs exactly one day (`startDate === endDate`)
2. **Atomic enqueue** - Use `graphile_worker.add_jobs()` SQL function within a transaction
3. **Serial execution** - Use `queueName: "meta_sync"` so only 1 Meta job runs at a time (prevents API flooding)
4. **Same task type** - Reuse existing `sync_meta_ads` task, just with single-day payloads

## Technical Approach

### Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/lib/queue.ts` | Add `addJobs()` method for batch job creation |
| `apps/api/src/routes/sync.ts` | Chunk date range and enqueue daily jobs |
| `apps/worker/src/scripts/trigger-sync.ts` | Update CLI to also chunk dates |
| `apps/worker/src/tasks/sync-meta-ads.ts` | Add `queueName` when jobs are created (already handles single-day ranges) |

### Implementation Details

#### 1. Add batch job support to queue.ts

```typescript
// apps/api/src/lib/queue.ts

// Add to JobPayloads type - no changes needed, payload structure stays same

// Add new method to queue object
async addJobs<T extends JobName>(
  jobs: Array<{ taskIdentifier: T; payload: JobPayloads[T] }>
): Promise<{ ids: string[] }> {
  const utils = await getWorkerUtils();

  // Use addJobs for atomic batch creation
  const createdJobs = await utils.addJobs(
    jobs.map((job, index) => ({
      identifier: job.taskIdentifier,
      payload: job.payload,
      queueName: 'meta_sync',  // Serial execution
      priority: index,          // Process in chronological order
    }))
  );

  return { ids: createdJobs.map(j => String(j.id)) };
}
```

#### 2. Chunk dates in sync route

```typescript
// apps/api/src/routes/sync.ts

function generateDailyDateRanges(
  startDate: Date,
  endDate: Date
): Array<{ startDate: string; endDate: string }> {
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    ranges.push({ startDate: dateStr, endDate: dateStr });
    current.setDate(current.getDate() + 1);
  }

  return ranges;
}

// In POST handler:
const dailyRanges = generateDailyDateRanges(startDate, endDate);

const result = await queue.addJobs(
  dailyRanges.map(range => ({
    taskIdentifier: 'sync_meta_ads' as const,
    payload: {
      startDate: range.startDate,
      endDate: range.endDate,
    },
  }))
);

res.status(202).json({
  data: {
    jobCount: result.ids.length,
    dateRange: { startDate, endDate },
  },
});
```

#### 3. Update trigger-sync.ts

```typescript
// apps/worker/src/scripts/trigger-sync.ts

// Same chunking logic, use addJobs instead of quickAddJob
const dailyRanges = generateDailyDateRanges(start, end);

console.log(`Enqueueing ${dailyRanges.length} daily sync jobs...`);

const workerUtils = await makeWorkerUtils({ connectionString });
await workerUtils.addJobs(
  dailyRanges.map((range, index) => ({
    identifier: 'sync_meta_ads',
    payload: range,
    queueName: 'meta_sync',
    priority: index,
  }))
);

console.log(`Enqueued ${dailyRanges.length} jobs for ${startDate} to ${endDate}`);
await workerUtils.release();
```

### Concurrency Control

Using `queueName: "meta_sync"` ensures jobs in this queue run **serially** (one at a time), regardless of the worker's `concurrency: 5` setting. This prevents flooding Meta's API.

From Graphile Worker docs:
> Jobs scheduled with a `queueName` are executed serially (one at a time) for that queue.

The worker's concurrency of 5 still applies to other job types (e.g., `send_email`), but Meta sync jobs will run one-by-one.

## Acceptance Criteria

- [ ] POST `/api/sync` with date range enqueues N daily jobs (where N = days in range)
- [ ] All daily jobs are enqueued atomically (all or none)
- [ ] Daily jobs run serially (one at a time) to avoid Meta API flooding
- [ ] Jobs process in chronological order (Jan 1 before Jan 2)
- [ ] CLI `pnpm --filter @boris/worker sync` also chunks into daily jobs
- [ ] Single-day request (startDate === endDate) works correctly (1 job)
- [ ] Response includes job count and date range

## Edge Cases

| Case | Behavior |
|------|----------|
| Single day (start === end) | 1 job enqueued |
| Invalid dates (end < start) | 400 error, no jobs enqueued |
| Large range (365 days) | 365 jobs enqueued atomically |
| Transaction failure | No jobs enqueued, error returned |

## Out of Scope (Future Work)

- Progress tracking / status endpoint for batch operations
- Job deduplication (preventing duplicate syncs for same date)
- Configurable chunk size (always daily for now)
- Rate limit detection from Meta API headers
- Retry logic improvements

## Testing

### Manual Testing

```bash
# Start services
pnpm docker:up
pnpm db:migrate
pnpm dev

# Test single day
curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-15", "endDate": "2024-01-15"}'
# Expected: { "data": { "jobCount": 1, ... } }

# Test multi-day
curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-01-07"}'
# Expected: { "data": { "jobCount": 7, ... } }

# Verify jobs in queue
psql $DATABASE_URL -c "SELECT * FROM graphile_worker._private_jobs WHERE task_identifier = 'sync_meta_ads'"

# Test CLI
pnpm --filter @boris/worker sync 2024-01-01 2024-01-31
# Expected: "Enqueued 31 jobs for 2024-01-01 to 2024-01-31"
```

## References

### Internal Files
- `apps/api/src/lib/queue.ts:26-34` - Current addJob implementation
- `apps/api/src/routes/sync.ts:14-43` - Current sync endpoint
- `apps/worker/src/index.ts:9-14` - Worker concurrency config
- `apps/worker/src/scripts/trigger-sync.ts` - CLI sync trigger

### External Docs
- [Graphile Worker addJobs()](https://worker.graphile.org/docs/library/add-job) - Batch job creation
- [Graphile Worker queueName](https://worker.graphile.org/docs/library/add-job#queuename) - Serial execution
- [Meta Marketing API Rate Limits](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting) - BUC limits
