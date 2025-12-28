---
status: pending
priority: p3
issue_id: "010"
tags:
  - code-review
  - architecture
  - consistency
dependencies: []
---

# Service Layer Bypass in Ad-Accounts Routes

## Problem Statement

The documented architecture specifies a "service layer pattern" which the old Users code followed. The new ad-accounts router bypasses this and calls database functions directly.

## Findings

**Previous Pattern (users.ts)**:
```typescript
import * as userService from '../services/user-service.js';
const users = await userService.getAllUsers();
```

**New Pattern (ad-accounts.ts)**:
```typescript
import { getAccountsWithSpending } from '@boris/database';
const accounts = await getAccountsWithSpending(...);
```

**Impact:**
- Inconsistent architecture
- Harder to add cross-cutting concerns (caching, logging, authorization)
- Less maintainable as business logic grows

## Proposed Solutions

### Option 1: Add Service Layer (Recommended for future)
- **Pros:** Consistent architecture, room for business logic
- **Cons:** More files, might be premature
- **Effort:** Medium
- **Risk:** Low

### Option 2: Document Decision to Skip
- **Pros:** Explicit tradeoff
- **Cons:** Technical debt
- **Effort:** Low
- **Risk:** Low

## Recommended Action

For now, document the decision. When adding features like caching or complex authorization, introduce a service layer.

## Technical Details

**Potential New Files:**
- `apps/api/src/services/analytics-service.ts`

## Acceptance Criteria

- [ ] Decision documented in CLAUDE.md or ADR
- [ ] (Future) Service layer when needed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
- CLAUDE.md mentions "service layer pattern"
