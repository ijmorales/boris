---
status: pending
priority: p3
issue_id: "009"
tags:
  - code-review
  - cleanup
  - yagni
dependencies: []
---

# Unused Code and YAGNI Violations

## Problem Statement

Several type definitions, functions, and props are defined but never used, violating YAGNI (You Aren't Gonna Need It).

## Findings

### Unused Code

| Location | Description | LOC |
|----------|-------------|-----|
| `apps/web/app/lib/types/dashboard.ts:33-41` | Unused `metrics` nested object in type | 9 |
| `apps/web/app/lib/types/dashboard.ts:51-56` | Unused `NavigationState` interface | 6 |
| `apps/web/app/lib/utils/currency.ts:39-59` | Unused `formatMetric` function | 21 |
| `apps/web/app/components/dashboard/objects-table.tsx:17,23-24` | Unused `showDrillDown` prop | 3 |
| Status/Platform badges | Unused `className` props | 2 |

**Total: ~41 lines of dead code**

## Proposed Solutions

### Option 1: Remove All Unused Code (Recommended)
- **Pros:** Cleaner codebase, less maintenance
- **Cons:** None
- **Effort:** Low
- **Risk:** Low

## Recommended Action

Remove unused code:

1. Delete `metrics` object from `AdObjectWithSpending` type
2. Delete `NavigationState` interface
3. Delete `formatMetric` function
4. Remove `showDrillDown` prop from `ObjectsTable`
5. Remove unused `className` props from badge components

## Technical Details

**Affected Files:**
- `apps/web/app/lib/types/dashboard.ts`
- `apps/web/app/lib/utils/currency.ts`
- `apps/web/app/components/dashboard/objects-table.tsx`
- `apps/web/app/components/dashboard/status-badge.tsx`
- `apps/web/app/components/dashboard/platform-badge.tsx`

## Acceptance Criteria

- [ ] All unused code removed
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
