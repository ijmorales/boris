# Meta Ads Sync

This document explains how the Meta Ads data synchronization works and how to trigger it manually.

## Overview

Boris syncs advertising data from Meta (Facebook/Instagram) Ads. The sync fetches performance metrics (spend, impressions, clicks, etc.) for all campaigns, ad sets, and ads within a specified date range.

## How It Works

### Data Flow

1. **API Request** - A POST request to `/api/sync` queues a `sync_meta_ads` job
2. **Worker Picks Up Job** - Graphile Worker processes the job
3. **Meta API Fetch** - The worker fetches data from Meta's Marketing API:
   - Discovers all ad accounts associated with the access token
   - Fetches insights at campaign, ad set, and ad levels
   - Uses daily granularity (`time_increment=1`)
4. **Database Upsert** - Data is stored in the database:
   - Ad accounts, campaigns, ad sets, and ads are upserted
   - Spending records are appended (append-only pattern for audit trail)

### Date Range Behavior

The sync accepts `startDate` and `endDate` parameters:
- Both dates are inclusive
- Meta API uses `YYYY-MM-DD` format internally
- The sync fetches daily data for each day in the range

Example: If you request `2025-12-01` to `2025-12-07`, you'll get 7 daily spending records per ad object.

## Triggering a Sync Manually

### Via API

Make a POST request to the sync endpoint:

```bash
curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-12-01",
    "endDate": "2025-12-07"
  }'
```

**Response:**
```json
{
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

The job runs asynchronously. Check worker logs for progress.

### Via Database (Direct Job Insertion)

You can also queue a job directly in PostgreSQL:

```sql
SELECT graphile_worker.add_job(
  'sync_meta_ads',
  json_build_object(
    'startDate', '2025-12-01',
    'endDate', '2025-12-07'
  )
);
```

### Common Sync Scenarios

**Sync yesterday's data:**
```bash
# Get yesterday's date
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -d "{\"startDate\": \"$YESTERDAY\", \"endDate\": \"$YESTERDAY\"}"
```

**Sync the last 7 days:**
```bash
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)

curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -d "{\"startDate\": \"$START_DATE\", \"endDate\": \"$END_DATE\"}"
```

**Backfill a specific month:**
```bash
curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-01",
    "endDate": "2025-11-30"
  }'
```

## Environment Requirements

The worker requires the `META_ADS_TOKEN` environment variable to be set:

```env
META_ADS_TOKEN=your_meta_access_token_here
```

This token needs the following Meta API permissions:
- `ads_read` - Read ad account data
- `ads_management` - Access ad insights

## Monitoring Sync Progress

### Worker Logs

The sync logs progress to stdout:

```
[Sync] Starting sync from 2025-12-01T00:00:00.000Z to 2025-12-07T00:00:00.000Z
[Sync] Platform connection ID: 550e8400-e29b-41d4-a716-446655440000
[Sync] Found 2 ad accounts: ["My Brand", "Client Account"]
[Sync] Processing account: My Brand (act_123456789)
[Meta API] GET /me/adaccounts
[Sync] Fetched 42 insights for account My Brand
[Sync] Upserted 15 ad objects
[Sync] Upserted spendings for 42 insights
[Sync] Sync completed!
```

### Checking Job Status

Query the Graphile Worker tables to see job status:

```sql
-- Pending jobs
SELECT * FROM graphile_worker.jobs
WHERE task_identifier = 'sync_meta_ads'
ORDER BY created_at DESC
LIMIT 10;

-- Failed jobs
SELECT * FROM graphile_worker.jobs
WHERE task_identifier = 'sync_meta_ads'
  AND attempts > 0
  AND last_error IS NOT NULL;
```

## Data Model

The sync populates these tables:

| Table | Description |
|-------|-------------|
| `platform_connections` | Meta platform connection (one per token) |
| `ad_accounts` | Ad accounts discovered from the token |
| `ad_objects` | Campaigns, ad sets, and ads (hierarchical) |
| `spendings` | Daily spending records (append-only) |

### Spending Records

Spending records use an **append-only** pattern:
- Each sync creates new records with a `collected_at` timestamp
- This allows tracking data changes over time
- To get the "latest" data for a period, filter by the most recent `collected_at`

Example query for latest spending:
```sql
SELECT DISTINCT ON (ad_object_id, period_start)
  ad_object_id,
  period_start,
  amount_cents,
  impressions,
  clicks
FROM spendings
WHERE period_start >= '2025-12-01'
  AND period_start <= '2025-12-07'
ORDER BY ad_object_id, period_start, collected_at DESC;
```

## Troubleshooting

### Common Errors

**"Meta API error (400)"**
- Check that your `META_ADS_TOKEN` is valid and not expired
- Verify the token has the required permissions

**"Meta API timeout"**
- Large date ranges may timeout
- Try smaller date ranges (e.g., 7 days instead of 30)

**"Invalid sync_meta_ads payload"**
- Ensure `startDate` and `endDate` are valid date strings
- Both fields are required

### Retry a Failed Sync

Failed jobs stay in the queue for automatic retry. To manually retry:

```sql
-- Reset a specific job for immediate retry
UPDATE graphile_worker.jobs
SET attempts = 0, run_at = NOW()
WHERE task_identifier = 'sync_meta_ads'
  AND id = 'your-job-id';
```
