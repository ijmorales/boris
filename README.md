# Boris

TypeScript monorepo with React frontend, Express API, and Graphile Worker.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker

## Quick Start

```bash
# Install dependencies
pnpm install

# Start database
pnpm docker:up

# Generate database schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start all services
pnpm dev
```

## Structure

```
apps/
  api/      Express API server (port 4000)
  web/      React Router v7 frontend (port 5173)
  worker/   Graphile Worker job processor
packages/
  database/ Drizzle ORM schema and client
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run Biome linter |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |
| `pnpm docker:up` | Start TimescaleDB container |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/boris_dev
```

## Apps

### API (`apps/api`)

Express REST API with:
- Zod request validation
- Service layer pattern
- Async error handling

### Web (`apps/web`)

React Router v7 with:
- Single Page Application (SPA) mode
- Vite bundler
- API proxy in development
- Clerk authentication

### Worker (`apps/worker`)

Graphile Worker with:
- PostgreSQL-native job queue
- Type-safe task payloads
- Zod validation

## Database

Uses Drizzle ORM with TimescaleDB (PostgreSQL 16 compatible).

Schema location: `packages/database/src/schema/`

## Deployment

### Web App (SPA)

The web app builds to static files that can be hosted on any static hosting service:

```bash
pnpm --filter @boris/web build
# Output: apps/web/build/client/
```

**Production Configuration:**

1. Set `VITE_API_URL` to your API server URL (e.g., `https://api.your-domain.com`)
2. Set `VITE_CLERK_PUBLISHABLE_KEY` from your Clerk dashboard
3. Configure CORS on the API server to allow your frontend origin

**Hosting Options:**
- **With reverse proxy (nginx/Caddy):** Proxy `/api/*` to the API server, serve static files for everything else
- **Separate origins:** Set `VITE_API_URL` and configure API CORS headers

### API Server

```bash
pnpm --filter @boris/api build
pnpm --filter @boris/api start
```

Runs on port 4000 by default. Configure `CORS_ORIGIN` to allow your frontend domain.
