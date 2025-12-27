# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm docker:up            # Start TimescaleDB container
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run database migrations
pnpm dev                  # Start all apps (API, web, worker)

# Linting and Type Checking
pnpm lint                 # Run Biome linter
pnpm lint:fix             # Auto-fix lint issues
pnpm type-check           # Run TypeScript type checking across all apps

# Testing
pnpm --filter @boris/api test          # Run API tests
pnpm --filter @boris/api test:watch    # Run API tests in watch mode

# Database
pnpm db:studio            # Open Drizzle Studio GUI

# Manual sync trigger
pnpm --filter @boris/worker sync       # Trigger Meta Ads sync manually
```

## Architecture

**Boris** is a paid media observability platform that syncs advertising data from Meta (and eventually Google Ads, TikTok) into TimescaleDB for analysis.

### Monorepo Structure (Turborepo + pnpm)

- **apps/api** - Express 5 REST API (port 4000). Uses Zod for request validation, service layer pattern, and queues jobs to the worker via Graphile Worker.
- **apps/web** - React Router v7 frontend with SSR (port 5173). Vite bundler.
- **apps/worker** - Graphile Worker job processor. Tasks are defined in `src/tasks/` with Zod-validated payloads.
- **packages/database** - Drizzle ORM schema and database client. Shared across API and worker.

### Data Model (packages/database/src/schema/boris.ts)

The core domain model for ad spend tracking:

```
PlatformConnection (META, GOOGLE_ADS, TIKTOK)
    └── AdAccount (external_id, currency, timezone)
            └── AdObject (CAMPAIGN > AD_SET > AD hierarchy via parent_id)
                    └── Spending (time-series data: amount, impressions, clicks, metrics)
```

- `spendings` table is designed for TimescaleDB hypertable (append-only time-series)
- `adObjects` uses self-referential `parent_id` for campaign/adset/ad hierarchy
- All tables use UUIDs internally, `external_id` for platform IDs

### Job Queue Pattern

API enqueues jobs via `apps/api/src/lib/queue.ts` → Worker processes via tasks in `apps/worker/src/tasks/`. Job payloads are type-safe with Zod schemas on both ends.

### Meta Ads Sync Flow

1. API exposes `/api/sync/meta` endpoint that queues `sync_meta_ads` job
2. Worker's `MetaSyncer` class fetches from Meta Graph API (campaigns, adsets, ads + insights)
3. Data upserted into `ad_accounts`, `ad_objects`, `spendings` tables

## Code Style

- Biome for linting/formatting (2-space indent, single quotes, semicolons)
- TypeScript with strict mode
- Each app loads its own `.env` file via `dotenv/config`

## Bug & Feature Tracking

Track bugs and feature requests in the Notion database:
https://www.notion.so/imrl/2d2e038049d9803384e2ef0bb8cf8fea?v=2d2e038049d980e9bb8b000c9ba416dd

When creating a new issue, include:
- **Title**: Brief description of the bug/feature
- **Type**: Bug or Feature
- **Priority**: Critical, High, Medium, Low
- **Description**: Detailed explanation with code references
- **Steps to Reproduce** (for bugs): How to trigger the issue
- **Expected vs Actual**: What should happen vs what happens
