---
status: pending
priority: p2
issue_id: "005"
tags:
  - code-review
  - performance
  - database
dependencies: []
---

# Missing Database Indexes for Analytics Queries

## Problem Statement

The analytics queries use patterns that require indexes not currently defined, causing sequential scans and sorts that will degrade significantly at scale.

## Findings

### Issue 1: DISTINCT ON Without Optimal Index

**Location:** `packages/database/src/queries/analytics.ts:66-70`

```typescript
.orderBy(
  spendings.adObjectId,
  spendings.periodStart,
  desc(spendings.collectedAt),  // No index includes this
)
```

Current index: `(ad_object_id, period_start)` - missing `collected_at`

**Impact at scale:**
- 1M records: ~2-5 seconds per query
- 10M records: ~20-50 seconds per query

### Issue 2: Missing Composite Index for Object Queries

**Location:** `packages/database/src/queries/analytics.ts:163-170`

Query filters on BOTH `ad_account_id` AND `parent_id`, but no composite index exists.

### Issue 3: TimescaleDB Partitioned by Wrong Column

The hypertable is partitioned by `collected_at` but all queries filter by `period_start`, so chunk exclusion doesn't work.

## Proposed Solutions

### Quick Wins (Recommended First)
1. Add deduplication index
2. Add composite ad_objects index

### Longer Term
3. Consider repartitioning hypertable by `period_start`

## Recommended Action

Add these migrations:

```sql
-- Deduplication index for DISTINCT ON
CREATE INDEX spendings_dedup_idx ON spendings (
  ad_object_id, period_start, collected_at DESC
);

-- Composite index for object queries
CREATE INDEX ad_objects_account_parent_idx
ON ad_objects (ad_account_id, parent_id);
```

## Technical Details

**Affected Files:**
- New: `packages/database/src/migrations/0003_add_analytics_indexes.sql`

## Acceptance Criteria

- [ ] Indexes created via migration
- [ ] EXPLAIN ANALYZE shows index usage
- [ ] Query times < 500ms for 1M records

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
- PostgreSQL DISTINCT ON: https://www.postgresql.org/docs/current/sql-select.html#SQL-DISTINCT
