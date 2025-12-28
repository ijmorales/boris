---
status: pending
priority: p2
issue_id: "004"
tags:
  - code-review
  - performance
  - frontend
dependencies: []
---

# Duplicate API Call When Viewing Objects

## Problem Statement

When drilling into an account to view objects, the frontend fetches ALL accounts just to find the current account's metadata, even though the API already returns this in the `meta` field.

## Findings

**Location:** `apps/web/app/components/dashboard/dashboard-content.tsx:144-147`

```typescript
// Fetch current account info - REDUNDANT
const accountsData = await fetchAdAccounts(dateRange);
const account = accountsData.find((a) => a.id === accountId);
setCurrentAccount(account || null);
```

**The API already returns account info:**
```typescript
// apps/api/src/routes/ad-accounts.ts:84-92
res.json({
  data: objects,
  meta: {
    account: { id, name, platform }  // Already included!
  }
});
```

**Impact:**
- Every drill-down navigation doubles the database load
- Unnecessary latency for users
- Wasteful query that aggregates spending for ALL accounts

## Proposed Solutions

### Option 1: Use Meta from Objects Response (Recommended)
- **Pros:** Zero additional API calls, data already available
- **Cons:** Need to update frontend API client to return meta
- **Effort:** Low
- **Risk:** Low

### Option 2: Add Dedicated Account Info Endpoint
- **Pros:** Separation of concerns
- **Cons:** Still requires additional API call
- **Effort:** Low
- **Risk:** Low

## Recommended Action

Update `fetchAdObjects` to return the full response including `meta.account`:

```typescript
// apps/web/app/lib/api/dashboard.ts
export async function fetchAdObjects(...) {
  const json = await response.json();
  return {
    objects: json.data,
    account: json.meta.account
  };
}

// dashboard-content.tsx
const { objects, account } = await fetchAdObjects(...);
setObjects(objects);
setCurrentAccount(account);
```

## Technical Details

**Affected Files:**
- `apps/web/app/lib/api/dashboard.ts`
- `apps/web/app/components/dashboard/dashboard-content.tsx`

## Acceptance Criteria

- [ ] Only one API call when viewing objects
- [ ] Account info displayed correctly in breadcrumbs
- [ ] Currency correctly used for formatting

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
