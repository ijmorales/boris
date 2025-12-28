---
status: pending
priority: p2
issue_id: "008"
tags:
  - code-review
  - security
  - api
dependencies:
  - "001"
---

# No Rate Limiting on API Endpoints

## Problem Statement

No rate limiting middleware is present on any endpoint, enabling brute-force attacks, data scraping, and DoS attacks.

## Findings

**Location:** `apps/api/src/index.ts`

No `express-rate-limit` or similar middleware configured.

**Impact:**
- Enables brute-force UUID enumeration attacks
- Facilitates large-scale data scraping
- API vulnerable to DoS attacks
- Could exhaust Meta API rate limits through uncontrolled sync requests

## Proposed Solutions

### Option 1: Add express-rate-limit (Recommended)
- **Pros:** Well-maintained, easy to configure
- **Cons:** In-memory by default (need Redis for production)
- **Effort:** Low
- **Risk:** Low

## Recommended Action

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
```

## Technical Details

**Affected Files:**
- `apps/api/src/index.ts`
- `apps/api/package.json` (add dependency)

## Acceptance Criteria

- [ ] Rate limiting applied to `/api/*` endpoints
- [ ] Appropriate limits set (stricter for sync)
- [ ] 429 response returned when limit exceeded

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
- express-rate-limit: https://www.npmjs.com/package/express-rate-limit
