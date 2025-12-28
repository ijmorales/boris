---
status: pending
priority: p1
issue_id: "003"
tags:
  - code-review
  - typescript
  - types
dependencies: []
---

# Type Mismatch Between Backend and Frontend

## Problem Statement

The frontend TypeScript types do not match the backend response types. This will cause runtime errors or silent data loss when the API returns fields the frontend doesn't expect.

## Findings

**Backend returns** (`packages/database/src/queries/analytics.ts:22-38`):
```typescript
export interface ObjectWithSpending {
  parentType: 'CAMPAIGN' | 'AD_SET' | 'AD' | null;
  ctr: number;  // flat field
  cpc: number;  // flat field
  cpm: number;  // flat field
}
```

**Frontend expects** (`apps/web/app/lib/types/dashboard.ts:21-42`):
```typescript
export interface AdObjectWithSpending {
  // Missing: parentType
  metrics: {  // nested object - NOT what API returns
    cpm?: number;
    cpc?: number;
    ctr?: number;
  };
}
```

**Additional mismatches:**
- Backend `name: string | null` vs Frontend `name: string` (non-nullable)
- Backend returns flat `ctr`, `cpc`, `cpm`, frontend expects nested `metrics` object
- Frontend type has index signature `[key: string]: unknown` which defeats TypeScript safety

## Proposed Solutions

### Option 1: Share Types from Database Package (Recommended)
- **Pros:** Single source of truth, eliminates drift
- **Cons:** May need to adjust some frontend-only properties
- **Effort:** Low
- **Risk:** Low

### Option 2: Create Shared Types Package
- **Pros:** Clear contract between frontend/backend
- **Cons:** Additional package to maintain
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Export types from `@boris/database` and import them in the frontend:

```typescript
// packages/database/src/index.ts
export type { AccountWithSpending, ObjectWithSpending } from './queries/analytics.js';

// apps/web/app/lib/types/dashboard.ts
import type { AccountWithSpending, ObjectWithSpending } from '@boris/database';
export type AdAccountWithSpending = AccountWithSpending;
export type AdObjectWithSpending = ObjectWithSpending;
```

## Technical Details

**Affected Files:**
- `packages/database/src/index.ts`
- `apps/web/app/lib/types/dashboard.ts`
- Any frontend components using the mismatched types

## Acceptance Criteria

- [ ] Frontend and backend use the same type definitions
- [ ] `pnpm type-check` passes with no errors
- [ ] No `any` casts or type assertions needed
- [ ] Nullable fields handled correctly in UI

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
