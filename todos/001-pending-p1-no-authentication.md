---
status: pending
priority: p1
issue_id: "001"
tags:
  - code-review
  - security
  - authentication
dependencies: []
---

# No Authentication on API Endpoints

## Problem Statement

All API endpoints (`/api/ad-accounts`, `/api/sync`) are publicly accessible without any authentication mechanism. This exposes financial advertising data to anyone on the network.

## Findings

**Location:** `apps/api/src/index.ts:16-18`

```typescript
app.use('/health', healthRouter);
app.use('/api/ad-accounts', adAccountsRouter);  // NO AUTH
app.use('/api/sync', syncRouter);                // NO AUTH
```

**Security Impact:**
- Any attacker can access ALL ad accounts and financial spending data
- Complete exposure of business-critical advertising metrics
- Violates data protection regulations (GDPR, CCPA)
- Trivial exploitability - simple HTTP GET request

**Proof of Concept:**
```bash
curl http://localhost:4000/api/ad-accounts?startDate=2024-01-01&endDate=2024-12-31
```

## Proposed Solutions

### Option 1: Add JWT Authentication Middleware (Recommended)
- **Pros:** Industry standard, stateless, integrates with Clerk
- **Cons:** Requires Clerk SDK integration
- **Effort:** Medium
- **Risk:** Low

### Option 2: Add Session-Based Authentication
- **Pros:** Simpler to implement
- **Cons:** Requires session storage, not ideal for API
- **Effort:** Medium
- **Risk:** Low

### Option 3: Add API Key Authentication
- **Pros:** Simple for service-to-service calls
- **Cons:** Less secure for user-facing APIs
- **Effort:** Low
- **Risk:** Medium (keys can leak)

## Recommended Action

Implement JWT authentication using Clerk's Express middleware. Create an `auth` middleware that verifies the JWT token and adds user context to requests.

## Technical Details

**Affected Files:**
- `apps/api/src/index.ts`
- New: `apps/api/src/middleware/auth.ts`

**Database Changes:** None

## Acceptance Criteria

- [ ] All `/api/*` endpoints require valid authentication
- [ ] Unauthenticated requests return 401 Unauthorized
- [ ] Authenticated requests include user context
- [ ] Health endpoint remains unauthenticated
- [ ] Tests verify authentication is enforced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-28 | Identified in code review | PR #9 review |

## Resources

- PR #9: https://github.com/ijmorales/boris/pull/9
- Clerk Express documentation: https://clerk.com/docs/references/backend/express
