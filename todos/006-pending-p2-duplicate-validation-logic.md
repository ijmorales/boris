---
status: pending
priority: p2
issue_id: "006"
tags:
  - code-review
  - quality
  - duplication
dependencies: []
---

# Duplicate Zod Error Transformation Logic

## Problem Statement

The same Zod error-to-details transformation is copy-pasted 3 times across the API routes, violating DRY principles.

## Findings

**Duplicated at:**
- `apps/api/src/routes/ad-accounts.ts:25-31`
- `apps/api/src/routes/ad-accounts.ts:62-68`
- `apps/api/src/routes/sync.ts:78-84`

```typescript
// Repeated 3 times:
const details: Record<string, string[]> = {};
for (const error of result.error.errors) {
  const path = error.path.join('.');
  if (!details[path]) details[path] = [];
  details[path].push(error.message);
}
throw new ValidationError('...', details);
```

## Proposed Solutions

### Option 1: Extract to Utility Function (Recommended)
- **Pros:** Simple, single responsibility
- **Cons:** None
- **Effort:** Low
- **Risk:** Low

## Recommended Action

Create a utility function:

```typescript
// apps/api/src/lib/validation.ts
import { ZodError } from 'zod';
import { ValidationError } from './errors.js';

export function zodErrorToDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const err of error.errors) {
    const path = err.path.join('.');
    if (!details[path]) details[path] = [];
    details[path].push(err.message);
  }
  return details;
}

export function throwValidationError(message: string, error: ZodError): never {
  throw new ValidationError(message, zodErrorToDetails(error));
}
```

## Technical Details

**Affected Files:**
- New: `apps/api/src/lib/validation.ts`
- `apps/api/src/routes/ad-accounts.ts`
- `apps/api/src/routes/sync.ts`

## Acceptance Criteria

- [ ] Validation error formatting extracted to single utility
- [ ] All routes use the shared utility
- [ ] No duplicated error transformation logic

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
