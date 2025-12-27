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

export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()];

export const loader = (args: Route.LoaderArgs) => rootAuthLoader(args);

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
