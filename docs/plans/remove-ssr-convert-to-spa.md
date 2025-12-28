# Remove SSR from Web App - Convert to SPA

**Type:** Refactor
**Priority:** Medium
**Created:** 2025-12-28

## Overview

Convert the Boris web application from Server-Side Rendering (SSR) to a pure Single Page Application (SPA) to simplify the architecture, reduce deployment complexity, and eliminate the need for a Node.js server at runtime.

## Problem Statement / Motivation

The current SSR setup adds complexity that may not be justified for an internal observability platform:

- Requires Node.js server runtime (`@react-router/serve`) for production
- Server-side middleware and loaders add complexity to authentication flow
- Deployment requires a running server process instead of static file hosting
- More moving parts to maintain and debug

Converting to SPA mode simplifies deployment (static hosting), reduces server infrastructure requirements, and maintains the same client-side functionality.

## Current Architecture

| Component | Current Implementation | File Location |
|-----------|----------------------|---------------|
| SSR Config | `ssr: true` with middleware flag | `apps/web/react-router.config.ts:4` |
| Server Runtime | `@react-router/serve` | `apps/web/package.json:8` |
| Auth Middleware | Clerk server middleware | `apps/web/app/root.tsx:12-14` |
| Auth Loader | `rootAuthLoader` from Clerk server | `apps/web/app/root.tsx:16` |
| Data Loader | Server `loader` with API fetch | `apps/web/app/routes/users.tsx:12-26` |

## Proposed Solution

Set `ssr: false` in React Router config, convert server loaders to client loaders, switch to client-only Clerk authentication, and update deployment to static file serving.

## Technical Approach

### Phase 1: Configuration Changes

**Files to modify:**

#### `apps/web/react-router.config.ts`

```typescript
import type { Config } from '@react-router/dev/config';

export default {
  ssr: false,
} satisfies Config;
```

- Remove `ssr: true`
- Remove `v8_middleware: true` (middleware not available in SPA mode)

#### `apps/web/package.json`

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "preview": "vite preview",
    "typecheck": "react-router typegen && tsc"
  }
}
```

- Remove `start` script (no server to run)
- Add `preview` script for local testing of built SPA

### Phase 2: Authentication Migration

**Key insight:** Clerk's `@clerk/react-router` package supports both SSR and client-only modes. For SPA, we use the client-side components without server loaders.

#### `apps/web/app/root.tsx`

```typescript
import { ClerkProvider, useAuth } from '@clerk/react-router';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from 'react-router';
import type { Route } from './+types/root';
import './app.css';

// REMOVE: Server imports
// import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';

// REMOVE: Server middleware
// export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()];

// REMOVE: Server loader
// export const loader = (args: Route.LoaderArgs) => rootAuthLoader(args);

// NEW: Client-side loading state
export function HydrateFallback() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Boris - Loading...</title>
      </head>
      <body className="bg-background text-foreground">
        <div className="flex h-screen items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </body>
    </html>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      navigate={(to) => navigate(to)}
    >
      <Outlet />
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // ... existing error boundary
}
```

**Critical changes:**
- Remove all imports from `@clerk/react-router/server`
- Remove `middleware` and `loader` exports
- Add `HydrateFallback` for loading state during hydration
- Wrap app in `ClerkProvider` with navigate function
- Ensure `VITE_CLERK_PUBLISHABLE_KEY` env var exists

### Phase 3: Route Protection

Create a client-side route protection component:

#### `apps/web/app/components/protected-route.tsx` (NEW FILE)

```typescript
import { useAuth, RedirectToSignIn } from '@clerk/react-router';
import { Outlet } from 'react-router';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">Checking authentication...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return children ?? <Outlet />;
}
```

#### Update protected routes layout

Wrap dashboard/protected routes with the `ProtectedRoute` component in the route configuration or layout.

### Phase 4: Data Loader Migration

Convert server `loader` functions to `clientLoader` functions.

#### `apps/web/app/routes/users.tsx`

```typescript
import type { Route } from './+types/users';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// NEW: Client loader (runs in browser)
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    // In SPA mode, use relative URL (Vite proxy handles /api in dev)
    const response = await fetch('/api/users');

    if (!response.ok) {
      return { users: [], error: `Failed to fetch users: ${response.status}` };
    }

    const users: User[] = await response.json();
    return { users, error: null };
  } catch (err) {
    return { users: [], error: 'Network error - API unavailable' };
  }
}

// NEW: Required for SPA mode - shows while clientLoader runs
export function HydrateFallback() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <div className="animate-pulse">Loading users...</div>
    </main>
  );
}

export function meta() {
  return [{ title: 'Users - Boris' }];
}

export default function Users({ loaderData }: Route.ComponentProps) {
  const { users, error } = loaderData;

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Users</h1>
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="p-4 border rounded">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

### Phase 5: API Authentication

For routes that require authenticated API calls, create a utility to get the Clerk token:

#### `apps/web/app/lib/api.ts` (NEW FILE)

```typescript
import { useAuth } from '@clerk/react-router';

// For use in components (hook-based)
export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  return async (url: string, options: RequestInit = {}) => {
    const token = await getToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };
}

// For clientLoaders - requires passing the auth instance
export async function fetchWithAuth(
  url: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
) {
  const token = await getToken();

  if (!token) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
```

**Note:** React hooks cannot be used directly in `clientLoader`. For authenticated API calls in loaders, we'll need to use Clerk's `getAuth()` pattern available in React Router v7 client context, or move data fetching to components using hooks.

### Phase 6: Environment Variables

Ensure the following environment variables are set:

#### `apps/web/.env` (update)

```bash
# Clerk (must be VITE_ prefixed for client-side access)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# API URL (for production, if not using proxy)
VITE_API_URL=http://localhost:4000
```

**Security note:** Never expose `CLERK_SECRET_KEY` in the web app. Secret keys should only exist in the API server.

### Phase 7: Dependency Cleanup

#### `apps/web/package.json`

**Dependencies to remove (optional):**
- `@react-router/serve` - Only needed for SSR runtime
- `isbot` - Bot detection for SSR optimization

**Dependencies to keep:**
- `@react-router/node` - Still required for build-time rendering
- `@clerk/react-router` - Client-side SDK still used

## Acceptance Criteria

### Functional Requirements

- [ ] Application builds successfully with `pnpm build`
- [ ] Application runs in development with `pnpm dev`
- [ ] All routes are accessible via direct URL (deep linking)
- [ ] Authentication flow works (sign in, sign out, OAuth)
- [ ] Protected routes redirect unauthenticated users to sign-in
- [ ] API calls work correctly with Clerk authentication
- [ ] Navigation between routes works without full page reload

### Non-Functional Requirements

- [ ] Build output is static files only (no `build/server/` directory)
- [ ] No SSR-related code remains in the bundle
- [ ] Loading states appear during initial hydration
- [ ] Loading states appear during route transitions with data fetching

### Testing Checklist

- [ ] Cold visit to `/` - shows home or redirects appropriately
- [ ] Cold visit to `/dashboard` (protected) - redirects to sign-in
- [ ] Sign in with Clerk - redirected to dashboard
- [ ] Navigate to `/users` - data loads correctly
- [ ] Direct URL to `/users` - page loads correctly
- [ ] Sign out - clears session, redirects to home
- [ ] OAuth flow (Google/GitHub) - completes successfully
- [ ] Token expiry - handles gracefully (refresh or re-auth)

## Implementation Order

1. **Update `react-router.config.ts`** - Set `ssr: false`
2. **Update `root.tsx`** - Remove server imports, add `HydrateFallback`
3. **Create `protected-route.tsx`** - Client-side auth guard
4. **Update protected route layouts** - Wrap with `ProtectedRoute`
5. **Convert `users.tsx` loader** - Change to `clientLoader`
6. **Create `api.ts` utility** - Authenticated fetch helper
7. **Update environment variables** - Ensure `VITE_` prefix
8. **Update `package.json` scripts** - Remove `start`, add `preview`
9. **Test all flows** - Complete testing checklist
10. **Remove unused dependencies** - `@react-router/serve`, `isbot`

## Deployment Changes

### Development

No changes - `pnpm dev` continues to work via Vite dev server.

### Production

Build output (`build/client/`) can be deployed to any static host:

**Option A: Nginx**
```nginx
server {
    listen 80;
    root /path/to/build/client;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
    }
}
```

**Option B: Vercel/Netlify**

Create `apps/web/public/_redirects` (Netlify):
```
/api/*  http://localhost:4000/api/:splat  200
/*      /index.html                        200
```

Or `apps/web/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "http://localhost:4000/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flash of unauthenticated content | Medium | `HydrateFallback` shows loading state until Clerk SDK loads |
| Deep links 404 | High | Configure static host fallback routing |
| API auth failures | High | Implement retry logic with token refresh |
| Clerk token in clientLoader | Medium | Move data fetching to components if needed |

## Open Questions

1. **Deployment target?** - Need to confirm if we're using nginx, Vercel, or another host
2. **API CORS?** - May need to configure CORS on API if not using proxy in production
3. **SEO requirements?** - SPA has limited SEO; confirm this is acceptable for internal tool

## References

### Internal Files
- `apps/web/react-router.config.ts:1-8` - Current SSR config
- `apps/web/app/root.tsx:1-16` - Server middleware and loader
- `apps/web/app/routes/users.tsx:12-26` - Example server loader
- `apps/web/vite.config.ts:1-22` - Vite config with proxy

### External Documentation
- [React Router SPA Mode Guide](https://reactrouter.com/how-to/spa)
- [React Router Client Data Loading](https://reactrouter.com/how-to/client-data)
- [React Router Rendering Strategies](https://reactrouter.com/start/framework/rendering)
- [Clerk React Router SDK](https://clerk.com/docs/references/react-router)
