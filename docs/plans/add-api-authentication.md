# Add Clerk Authentication to Boris API

**Date:** 2025-12-27
**Type:** Feature
**Scope:** API layer only (web app already has Clerk)

## Overview

Add Clerk authentication to the Express 5 API (`apps/api`) to protect endpoints. The web app already has Clerk integrated via `@clerk/react-router`. This work adds the backend counterpart using `@clerk/express`.

**Key Constraint:** Resources are NOT scoped to users. This is acknowledged and out of scope. This plan focuses only on verifying that requests come from authenticated users.

## Problem Statement

The API has no authentication. All routes (`/api/users`, `/api/sync`) are publicly accessible. Anyone can trigger data syncs or access user data without identity verification.

## Proposed Solution

### Phase 1: Install and Configure Clerk

**1.1 Install Dependency**

```bash
pnpm --filter @boris/api add @clerk/express
```

**1.2 Update Environment Schema**

```typescript
// apps/api/src/lib/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
});
```

**1.3 Update .env.example**

```bash
# apps/api/.env.example
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boris_dev
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Clerk authentication (same keys as web app)
# Get from https://dashboard.clerk.com/last-active?path=api-keys
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
```

### Phase 2: Create Auth Middleware

**2.1 Add UnauthorizedError**

```typescript
// apps/api/src/lib/errors.ts (add to existing file)
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

**2.2 Create Auth Middleware**

```typescript
// apps/api/src/middleware/auth.ts (new file)
import { getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Middleware that requires authentication for API routes.
 * Returns 401 JSON response if not authenticated (no redirect).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  next();
};
```

### Phase 3: Apply Middleware to Express App

**3.1 Update index.ts**

```typescript
// apps/api/src/index.ts
import 'dotenv/config';
import { closeDatabase } from '@boris/database';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { syncRouter } from './routes/sync.js';
import { usersRouter } from './routes/users.js';

const app = express();

// CORS must include credentials for session cookies
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Health check BEFORE Clerk middleware (always accessible)
app.use('/health', healthRouter);

// Clerk middleware attaches auth to all subsequent requests
app.use(clerkMiddleware());

// Protected routes
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/sync', requireAuth, syncRouter);

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.close();
  await closeDatabase();
  process.exit(0);
});
```

### Phase 4: Update Error Handler

The error handler already handles `AppError` subclasses, so `UnauthorizedError` will work automatically. No changes needed.

### Phase 5: Update Tests

**5.1 Mock Clerk in Tests**

```typescript
// apps/api/src/__tests__/setup.ts or in individual test files
import { vi } from 'vitest';

// Mock clerkMiddleware to set auth for tests
vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req: any, _res: any, next: any) => {
    // Default to authenticated user in tests
    req.auth = { userId: 'test-user-id', sessionId: 'test-session-id' };
    next();
  },
  getAuth: (req: any) => req.auth || { userId: null, sessionId: null },
}));
```

**5.2 Add Auth Tests**

```typescript
// apps/api/src/__tests__/auth.test.ts (new file)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
// ... test that unauthenticated requests return 401
// ... test that authenticated requests succeed
```

## Acceptance Criteria

- [ ] Unauthenticated requests to `/api/users` return 401 JSON
- [ ] Unauthenticated requests to `/api/sync` return 401 JSON
- [ ] Unauthenticated requests to `/health` return 200 (always public)
- [ ] Authenticated requests (with valid Clerk session) succeed
- [ ] Error response format: `{ error: { message, code } }`
- [ ] `pnpm dev` starts without errors
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm --filter @boris/api test` passes

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/package.json` | Modify | Add `@clerk/express` |
| `apps/api/src/lib/env.ts` | Modify | Add `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` |
| `apps/api/.env.example` | Modify | Add Clerk env var placeholders |
| `apps/api/src/lib/errors.ts` | Modify | Add `UnauthorizedError` class |
| `apps/api/src/middleware/auth.ts` | Create | Add `requireAuth` middleware |
| `apps/api/src/index.ts` | Modify | Add clerkMiddleware, requireAuth, credentials CORS |
| `apps/api/src/__tests__/auth.test.ts` | Create | Add auth tests |

## Technical Considerations

### CORS Credentials (Critical)

The CORS configuration **must** include `credentials: true` to allow session cookies:

```typescript
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,  // REQUIRED for cookies
}));
```

Without this, browsers won't send the Clerk session cookie on cross-origin requests (localhost:5173 → localhost:4000).

### Middleware Order

The order matters:
1. `cors` - Handle CORS before anything
2. `express.json()` - Parse request bodies
3. `/health` route - Public, no auth needed
4. `clerkMiddleware()` - Attach auth to all subsequent requests
5. Protected routes with `requireAuth`
6. `errorHandler` - Catch and format errors

### Error Response Format

Follows existing pattern from `AppError`:

```json
{
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

### TypeScript Types

The `@clerk/express` package provides types. The `getAuth()` helper returns:

```typescript
interface Auth {
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
  // ... other properties
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CORS credentials missing | Auth completely broken | Explicit in plan, test manually |
| Clerk SDK errors crash app | API unavailable | Errors caught by errorHandler |
| Tests don't mock Clerk | CI failures | Mock clerkMiddleware in setup |
| Different Clerk keys than web | Auth fails | Use same keys, document clearly |

## Out of Scope

- User database sync (Clerk → Boris `users` table)
- `clerkId` column in users table
- User-resource authorization (linking platformConnections to users)
- Role-based access control
- Bearer token / API key support
- Clerk webhooks

## Testing Checklist

**Manual Testing:**
1. Start API and web app: `pnpm dev`
2. Open web app, sign in with Clerk
3. Open browser DevTools → Network tab
4. Trigger a sync from the UI (or call API from console)
5. Verify request includes cookie and succeeds
6. Sign out
7. Try same API call → should get 401

**curl Testing:**
```bash
# Should return 401
curl http://localhost:4000/api/users

# Should return 200
curl http://localhost:4000/health
```

## References

- Clerk Express SDK: https://clerk.com/docs/references/express/overview
- `apps/web/app/root.tsx:1-15` - Web app Clerk setup
- `apps/api/src/middleware/error-handler.ts:1-23` - Error handling pattern
- `apps/api/src/lib/errors.ts:1-25` - Error class pattern
- `plans/add-clerk-authentication.md` - Web app auth plan (reference)
