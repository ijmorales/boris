---
status: pending
priority: p2
issue_id: "007"
tags:
  - code-review
  - validation
  - api
dependencies: []
---

# Missing Date Range Validation

## Problem Statement

The ad-accounts API validates that dates are valid dates, but does not validate that `endDate >= startDate`. The sync router has this validation, but it's missing from the ad-accounts router.

## Findings

**Location:** `apps/api/src/routes/ad-accounts.ts:13-16`

```typescript
const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  // Missing: .refine() to validate end >= start
});
```

**Compare with sync router** (`apps/api/src/routes/sync.ts`):
```typescript
const startSyncSchema = z.object({...})
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  });
```

## Proposed Solutions

### Option 1: Add Refine Validation (Recommended)
- **Pros:** Consistent with existing pattern, proper error message
- **Cons:** None
- **Effort:** Low
- **Risk:** Low

## Recommended Action

Update the schema:

```typescript
const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'endDate must be >= startDate',
  path: ['endDate'],
});
```

## Technical Details

**Affected Files:**
- `apps/api/src/routes/ad-accounts.ts`

## Acceptance Criteria

- [ ] Invalid date ranges return 400 with clear error message
- [ ] Valid date ranges work correctly
- [ ] Consistent with sync endpoint validation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
