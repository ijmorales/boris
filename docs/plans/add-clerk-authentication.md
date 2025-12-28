# Add Clerk Authentication to Boris Web App

**Date:** 2025-12-27
**Type:** Feature
**Scope:** Web UI only (API protection is separate work)

## Overview

Integrate Clerk authentication into the Boris web app (`apps/web`) to enable user sign-up, sign-in, and session management. Uses `@clerk/react-router` for React Router v7 SSR support.

**Important:** This adds authentication UI to the web app only. The Express API remains unprotected. Full security requires a follow-up to add API authentication.

## Problem Statement

Boris has no user authentication. Users cannot securely identify themselves or have personalized experiences. This plan adds the foundation for auth in the web UI.

## Proposed Solution

### Phase 1: Install and Configure Clerk

**1.1 Install Dependency**

```bash
pnpm --filter @boris/web add @clerk/react-router
```

**1.2 Enable Middleware in react-router.config.ts**

```typescript
// apps/web/react-router.config.ts
import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  future: {
    v8_middleware: true,
  },
} satisfies Config;
```

**1.3 Update root.tsx**

Add only these changes to the existing file:

```typescript
// Add to imports
import { ClerkProvider } from '@clerk/react-router';
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';
import type { Route } from './+types/root';

// Add before Layout function
export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()];

export const loader = (args: Route.LoaderArgs) => rootAuthLoader(args);

// Modify Root function to accept loaderData and wrap with ClerkProvider
export default function Root({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider loaderData={loaderData}>
      <Outlet />
    </ClerkProvider>
  );
}
```

**1.4 Environment Variables**

Create `apps/web/.env.local` (already gitignored):

```bash
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Update `apps/web/.env.example`:

```bash
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### Phase 2: Add Auth UI to Home Page

Update `apps/web/app/routes/home.tsx` with auth components:

```typescript
// apps/web/app/routes/home.tsx
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/react-router';

export function meta() {
  return [
    { title: 'Boris - Paid Media Observability' },
    { name: 'description', content: 'Track and analyze your ad spend' },
  ];
}

export default function Home() {
  return (
    <>
      <header>
        <h1>Boris</h1>
        <nav>
          <SignedOut>
            <SignInButton mode="modal" />
            <SignUpButton mode="modal" />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
      </header>
      <main>
        <SignedOut>
          <h2>Welcome to Boris</h2>
          <p>Sign in to view your ad spend analytics.</p>
        </SignedOut>
        <SignedIn>
          <h2>Dashboard</h2>
          <p>Your ad spend data will appear here.</p>
        </SignedIn>
      </main>
    </>
  );
}
```

## Acceptance Criteria

- [ ] Users can sign in/out via Clerk modal
- [ ] Auth state persists across page refresh
- [ ] `pnpm dev` starts without errors
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes

## File Changes

| File | Action |
|------|--------|
| `apps/web/package.json` | Add `@clerk/react-router` |
| `apps/web/react-router.config.ts` | Add `v8_middleware: true` |
| `apps/web/app/root.tsx` | Add middleware, loader, ClerkProvider |
| `apps/web/app/routes/home.tsx` | Add auth UI components |
| `apps/web/.env.example` | Add Clerk env var placeholders |
| `apps/web/.env.local` | Create with real Clerk keys |

## Out of Scope

- API authentication (requires `@clerk/express`)
- User database sync (Clerk → Boris `users` table)
- Protected route utilities
- User-resource authorization

## References

- [Clerk React Router Quickstart](https://clerk.com/docs/quickstarts/react-router)
- `apps/web/app/root.tsx:1-66` - Current root layout
- `apps/web/react-router.config.ts:1-5` - Current config
