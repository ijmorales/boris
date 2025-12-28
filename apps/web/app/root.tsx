import { ClerkProvider } from '@clerk/clerk-react';
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

export function HydrateFallback() {
  // Note: HydrateFallback renders as children of Layout, not as a full document
  return (
    <>
      {/* Header skeleton */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '24px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
          }}
        />
        <div style={{ flex: 1 }} />
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#e5e7eb',
            borderRadius: '50%',
          }}
        />
      </header>
      {/* Content skeleton */}
      <main style={{ padding: '2rem' }}>
        <div
          style={{
            width: '200px',
            height: '32px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '1.5rem',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
          }}
        />
      </main>
    </>
  );
}

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

export default function Root() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <div
        style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ color: '#dc2626' }}>Configuration Error</h1>
        <p>
          Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code> environment variable.
        </p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Please add this variable to your <code>.env</code> file. You can get
          your publishable key from the{' '}
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Clerk Dashboard
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
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
