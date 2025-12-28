# feat: Remove Users Feature

## Overview

Remove the Users feature entirely from the Boris monorepo, including the database schema, API layer, and web frontend. This is a cleanup task to remove an unused prototype feature.

## Problem Statement / Motivation

The Users feature was scaffolded as part of the initial monorepo setup but is not being used. The Boris platform focuses on `PlatformConnection` → `AdAccount` → `AdObject` → `Spending` data model for Meta Ads synchronization. Removing unused code reduces maintenance burden and prevents confusion.

## Proposed Solution

Complete removal of the Users feature using a git worktree for isolated work, following an outside-in approach (Frontend → API → Database).

## Technical Approach

### Removal Order

```
1. Frontend (React Router v7)  →  First
2. API Layer (Express)         →  Second
3. Database Schema (Drizzle)   →  Last
```

This order ensures no runtime errors from code trying to access removed database objects.

### Architecture Impact

- **Database**: Drop `users` table (simple table with no foreign keys)
- **API**: Remove `/api/users` endpoints
- **Web**: Remove `/users` route and navigation link

## Files to Remove/Modify

### Delete Entirely

| File | Purpose |
|------|---------|
| `packages/database/src/schema/users.ts` | Users table schema definition |
| `apps/api/src/services/user-service.ts` | User CRUD service layer |
| `apps/api/src/routes/users.ts` | Express routes for `/api/users` |
| `apps/web/app/routes/users.tsx` | React users list page |

### Modify

| File | Change |
|------|--------|
| `packages/database/src/schema/index.ts:2` | Remove `export * from './users.js';` |
| `packages/database/drizzle.config.ts:12` | Remove `'./src/schema/users.ts'` from schema array |
| `apps/api/src/index.ts:9` | Remove `import { usersRouter }` |
| `apps/api/src/index.ts:17` | Remove `app.use('/api/users', usersRouter);` |
| `apps/web/app/routes.ts:6` | Remove `route('users', 'routes/users.tsx'),` |
| `apps/web/app/routes/home.tsx:18` | Remove `<Link to="/users">Users</Link>` navigation |

### Migration Files

| File | Action |
|------|--------|
| `packages/database/src/migrations/0000_boris_data_model.sql:3-10` | Lines will be overwritten by new migration |
| `packages/database/src/migrations/meta/0000_snapshot.json:7-58` | Will be updated automatically |
| New: `packages/database/src/migrations/XXXX_remove_users_table.sql` | `DROP TABLE IF EXISTS users;` |

## Implementation Phases

### Phase 1: Worktree Setup

```bash
# Create isolated worktree for removal work
git worktree add -b feat/remove-users ../boris-remove-users main
cd ../boris-remove-users
pnpm install

# Run baseline tests
pnpm turbo test
pnpm type-check
```

**Success Criteria:**
- [ ] Worktree created successfully
- [ ] Dependencies installed
- [ ] All tests pass in clean state

### Phase 2: Frontend Removal

```bash
# In apps/web/
```

**Tasks:**
- [ ] Delete `apps/web/app/routes/users.tsx`
- [ ] Remove route from `apps/web/app/routes.ts`
- [ ] Remove navigation link from `apps/web/app/routes/home.tsx`

**Verification:**
```bash
pnpm --filter @boris/web type-check
pnpm --filter @boris/web build
```

**Commit:** `feat: remove users page from frontend`

### Phase 3: API Removal

```bash
# In apps/api/
```

**Tasks:**
- [ ] Delete `apps/api/src/services/user-service.ts`
- [ ] Delete `apps/api/src/routes/users.ts`
- [ ] Remove imports and route registration from `apps/api/src/index.ts`

**Verification:**
```bash
pnpm --filter @boris/api test
pnpm --filter @boris/api type-check
```

**Commit:** `feat: remove users endpoints from API`

### Phase 4: Database Schema Removal

```bash
# In packages/database/
```

**Tasks:**
- [ ] Delete `packages/database/src/schema/users.ts`
- [ ] Remove export from `packages/database/src/schema/index.ts`
- [ ] Remove schema reference from `packages/database/drizzle.config.ts`
- [ ] Generate migration: `pnpm db:generate`
- [ ] Review generated migration SQL (should contain `DROP TABLE users`)

**Verification:**
```bash
pnpm --filter @boris/database type-check
pnpm db:migrate  # Apply migration locally
```

**Commit:** `feat: remove users table from database schema`

### Phase 5: Final Verification

**Tasks:**
- [ ] Run full test suite: `pnpm turbo test`
- [ ] Run type check: `pnpm type-check`
- [ ] Run linter: `pnpm lint:fix`
- [ ] Start dev servers: `pnpm dev`
- [ ] Verify `/users` returns 404
- [ ] Verify no console errors on frontend
- [ ] Verify API health endpoint works

**Commit:** `chore: cleanup after users feature removal`

### Phase 6: PR and Cleanup

```bash
# Push and create PR
git push -u origin feat/remove-users

# After merge, cleanup worktree
cd /home/nacho/projects/boris
git worktree remove ../boris-remove-users
git worktree prune
```

## Acceptance Criteria

### Functional Requirements

- [ ] `/api/users` endpoints return 404
- [ ] `/users` web route returns 404
- [ ] Home page navigation does not include "Users" link
- [ ] Database no longer contains `users` table
- [ ] No TypeScript errors in any package
- [ ] All existing tests pass

### Non-Functional Requirements

- [ ] No orphaned imports or dead code
- [ ] Migration is clean and minimal
- [ ] Commit history is atomic and descriptive

### Quality Gates

- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm turbo test` passes
- [ ] Manual smoke test of dev environment

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Foreign key constraints prevent DROP | Low | Medium | Verify no FKs exist before migration |
| Tests reference users feature | Low | Low | Search for `*user*` test files |
| Cached frontend routes | Low | Low | Browser refresh resolves |

### Pre-Removal Verification

Run this query to confirm no foreign keys:
```sql
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'users'
   OR constraint_name LIKE '%users%';
```

## Dependencies & Prerequisites

- Git worktree support (standard git feature)
- Local TimescaleDB running (`pnpm docker:up`)
- All dependencies installed (`pnpm install`)

## References & Research

### Internal References

- Schema definition: `packages/database/src/schema/users.ts:1-12`
- API routes: `apps/api/src/routes/users.ts:1-69`
- User service: `apps/api/src/services/user-service.ts:1-21`
- Web route: `apps/web/app/routes/users.tsx:1-56`

### Best Practices Applied

- Outside-in removal order (Frontend → API → Database)
- Atomic commits per layer
- Isolated worktree for safe development
- Type checking at each phase

### Commands Reference

```bash
# Worktree management
git worktree add -b feat/remove-users ../boris-remove-users main
git worktree list
git worktree remove ../boris-remove-users

# Development
pnpm install
pnpm dev
pnpm type-check
pnpm lint:fix

# Database
pnpm db:generate
pnpm db:migrate
pnpm db:studio

# Testing
pnpm turbo test
pnpm --filter @boris/api test
```

## Notes

- The `auth/` and `meta-dashboard/` directories in git status are separate worktrees/branches that may contain copies of Users feature - they are not part of this removal scope
- No production data exists as this is a development-only prototype
- No external clients consume the users API
