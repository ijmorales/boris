import { ClerkProvider } from '@clerk/react-router';
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root';
import './app.css';

// Check if Clerk is configured (server-side only)
const isClerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);

// Only apply Clerk middleware if configured
export const middleware: Route.MiddlewareFunction[] = isClerkConfigured
  ? [clerkMiddleware()]
  : [];

// Loader that handles auth when Clerk is configured
export const loader = (args: Route.LoaderArgs) => {
  if (isClerkConfigured) {
    return rootAuthLoader(args);
  }
  // Return empty auth state when Clerk is not configured
  return { clerkState: null };
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root({ loaderData }: Route.ComponentProps) {
  // Only wrap with ClerkProvider if Clerk is configured
  if (!isClerkConfigured) {
    return <Outlet />;
  }

  return (
    <ClerkProvider loaderData={loaderData}>
      <Outlet />
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>{message}</h1>
      <p>{details}</p>
      {import.meta.env.DEV && stack && (
        <pre
          style={{
            padding: '1rem',
            background: '#f4f4f4',
            overflow: 'auto',
          }}
        >
          {stack}
        </pre>
      )}
    </main>
  );
}
