# feat: Monorepo Scaffold Setup

**Created:** 2025-12-24
**Updated:** 2025-12-24 (Post-review revision)
**Type:** Enhancement
**Detail Level:** MORE (Standard Issue)

---

## Overview

Set up a TypeScript monorepo with three deployable applications sharing a PostgreSQL database:

1. **Web** - React (React Router v7 + Vite) frontend
2. **API** - Express backend with TypeScript
3. **Worker** - Graphile Worker job processor

The scaffold includes modern tooling (pnpm, Turborepo, Biome, Drizzle ORM) and proper validation, error handling, and service layer patterns.

---

## Changes from Review

Based on reviewer feedback, this plan has been simplified:

| Removed | Reason |
|---------|--------|
| `packages/config/` | Over-abstraction; inline tsconfig in each app |
| `packages/shared-types/` | Use database types directly |
| pgAdmin container | Use Drizzle Studio instead |

| Added | Reason |
|-------|--------|
| Zod validation | Input validation for API routes and worker payloads |
| Service layer | Separate business logic from route handlers |
| Async error wrapper | Prevent unhandled promise rejections |
| Environment validation | Type-safe env var parsing |
| Connection cleanup | Graceful shutdown for database pool |

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Monorepo Tool** | Turborepo + pnpm | Simple, fast |
| **Package Manager** | pnpm 9.x | Strict dependency resolution |
| **Frontend** | React Router v7 + Vite | Modern routing |
| **Backend** | Express 4.x + TypeScript | Battle-tested |
| **Job Queue** | Graphile Worker | PostgreSQL-native |
| **Database** | TimescaleDB (PostgreSQL 16) + Drizzle ORM | Type-safe queries, time-series ready |
| **Linting/Formatting** | Biome | Fast |
| **Validation** | Zod | Runtime type safety |
| **Runtime** | Node.js 20 LTS | Current LTS |

---

## Project Structure

```
boris/
├── apps/
│   ├── web/                      # React Router v7 + Vite
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── routes.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── react-router.config.ts
│   ├── api/                      # Express backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/         # Business logic
│   │   │   ├── middleware/
│   │   │   ├── lib/
│   │   │   │   ├── async-handler.ts
│   │   │   │   └── env.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── worker/                   # Graphile Worker
│       ├── src/
│       │   ├── tasks/
│       │   ├── lib/
│       │   │   └── env.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── database/                 # Shared database package
│       ├── src/
│       │   ├── schema/
│       │   ├── migrations/
│       │   └── client.ts
│       ├── drizzle.config.ts
│       └── package.json
├── docker/
│   └── docker-compose.yml        # PostgreSQL only
├── .env.example
├── .gitignore
├── biome.json
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Technical Approach

### Phase 1: Foundation Setup

**Files to create:**

```
/pnpm-workspace.yaml
```

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

```
/package.json
```

```json
{
  "name": "boris",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "type-check": "turbo run type-check",
    "db:generate": "pnpm --filter @boris/database db:generate",
    "db:migrate": "pnpm --filter @boris/database db:migrate",
    "db:studio": "pnpm --filter @boris/database db:studio",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

---

```
/turbo.json
```

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalEnv": ["NODE_ENV", "DATABASE_URL"],
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".react-router/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

```
/biome.json
```

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": ["node_modules", "dist", ".react-router"]
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

---

```
/docker/docker-compose.yml
```

```yaml
services:
  db:
    image: timescale/timescaledb:latest-pg16
    container_name: boris-db
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: boris_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - db_data:/home/postgres/pgdata/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db_data:
```

> **Note:** Using TimescaleDB image for future time-series support. It's a drop-in replacement for PostgreSQL - all standard PostgreSQL features work normally. When ready for time-series data, you can convert tables to hypertables.

---

```
/.env.example
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boris_dev
```

---

```
/.gitignore
```

```gitignore
node_modules/
dist/
.react-router/
.env
.env.local
.turbo/
coverage/
*.log
.DS_Store
```

---

### Phase 2: Database Package

```
/packages/database/package.json
```

```json
{
  "name": "@boris/database",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.4",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.1",
    "dotenv": "^16.4.7",
    "typescript": "^5.7.2",
    "@types/node": "^22.10.2"
  }
}
```

---

```
/packages/database/tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

```
/packages/database/drizzle.config.ts
```

```typescript
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  schema: './src/schema/*',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

```
/packages/database/src/index.ts
```

```typescript
export { db, pool, closeDatabase } from './client.js';
export * from './schema/index.js';
```

---

```
/packages/database/src/client.ts
```

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = postgres(connectionString, { max: 10 });
export const db = drizzle(pool, { schema });

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
```

---

```
/packages/database/src/schema/index.ts
```

```typescript
export * from './users.js';
```

---

```
/packages/database/src/schema/users.ts
```

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

---

### Phase 3: Express API Backend

```
/apps/api/package.json
```

```json
{
  "name": "@boris/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@boris/database": "workspace:*",
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

---

```
/apps/api/tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

```
/apps/api/src/lib/env.ts
```

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

---

```
/apps/api/src/lib/async-handler.ts
```

```typescript
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

---

```
/apps/api/src/lib/errors.ts
```

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public details?: Record<string, string[]>
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
```

---

```
/apps/api/src/services/user-service.ts
```

```typescript
import { db, users, type User, type NewUser } from '@boris/database';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../lib/errors.js';

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users);
}

export async function getUserById(id: string): Promise<User> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('User not found');
  }

  return result[0];
}

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
```

---

```
/apps/api/src/routes/users.ts
```

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import * as userService from '../services/user-service.js';

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255),
});

usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await userService.getAllUsers();
    res.json({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  })
);

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    });
  })
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = createUserSchema.safeParse(req.body);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const error of result.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Validation failed', details);
    }

    const user = await userService.createUser(result.data);
    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    });
  })
);
```

---

```
/apps/api/src/routes/health.ts
```

```typescript
import { Router } from 'express';
import { db } from '@boris/database';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../lib/async-handler.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  })
);
```

---

```
/apps/api/src/middleware/error-handler.ts
```

```typescript
import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...('details' in err && { details: err.details }),
      },
    });
  }

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};
```

---

```
/apps/api/src/index.ts
```

```typescript
import express from 'express';
import cors from 'cors';
import { env } from './lib/env.js';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/error-handler.js';
import { closeDatabase } from '@boris/database';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/users', usersRouter);

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

---

### Phase 4: Graphile Worker

```
/apps/worker/package.json
```

```json
{
  "name": "@boris/worker",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@boris/database": "workspace:*",
    "graphile-worker": "^0.16.6",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

---

```
/apps/worker/tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

```
/apps/worker/src/lib/env.ts
```

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

---

```
/apps/worker/src/tasks/index.ts
```

```typescript
import type { TaskList } from 'graphile-worker';
import { sendEmail } from './send-email.js';

export const tasks: TaskList = {
  send_email: sendEmail,
};
```

---

```
/apps/worker/src/tasks/send-email.ts
```

```typescript
import type { Task } from 'graphile-worker';
import { z } from 'zod';

const sendEmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string(),
  from: z.string().email().optional().default('noreply@boris.local'),
});

export const sendEmail: Task = async (payload, helpers) => {
  const result = sendEmailPayloadSchema.safeParse(payload);

  if (!result.success) {
    helpers.logger.error(`Invalid payload: ${result.error.message}`);
    throw new Error(`Invalid send_email payload: ${result.error.message}`);
  }

  const { to, subject, body, from } = result.data;

  helpers.logger.info(`Sending email to ${to}: ${subject}`);

  // TODO: Implement actual email sending
  console.log({ from, to, subject, body });

  helpers.logger.info(`Email sent successfully to ${to}`);
};
```

---

```
/apps/worker/src/index.ts
```

```typescript
import { run } from 'graphile-worker';
import { env } from './lib/env.js';
import { tasks } from './tasks/index.js';

async function main() {
  console.log('Starting Graphile Worker...');

  const runner = await run({
    connectionString: env.DATABASE_URL,
    concurrency: 5,
    pollInterval: 1000,
    taskList: tasks,
  });

  console.log('Worker is running');

  await runner.promise;
}

main().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
```

---

### Phase 5: React Frontend

```
/apps/web/package.json
```

```json
{
  "name": "@boris/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.1.1"
  },
  "devDependencies": {
    "@react-router/dev": "^7.1.1",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.6",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

---

```
/apps/web/tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "rootDirs": [".", "./.react-router/types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", ".react-router/types/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

```
/apps/web/vite.config.ts
```

```typescript
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

---

```
/apps/web/react-router.config.ts
```

```typescript
import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  ssr: false,
} satisfies Config;
```

---

```
/apps/web/src/routes.ts
```

```typescript
import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('/', 'routes/home.tsx'),
  route('/users', 'routes/users.tsx'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
```

---

```
/apps/web/src/root.tsx
```

```typescript
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
  return <Outlet />;
}
```

---

```
/apps/web/src/routes/home.tsx
```

```typescript
import { Link } from 'react-router';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Boris</h1>
      <p>Welcome to your new monorepo!</p>
      <nav>
        <Link to="/users">View Users</Link>
      </nav>
    </div>
  );
}
```

---

```
/apps/web/src/routes/users.tsx
```

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface ApiResponse {
  data: UserResponse[];
}

export default function Users() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setUsers(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Users</h1>
      <Link to="/">Back to Home</Link>
      <ul style={{ marginTop: '1rem' }}>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

```
/apps/web/src/routes/not-found.tsx
```

```typescript
import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>404 - Page Not Found</h1>
      <Link to="/">Go Home</Link>
    </div>
  );
}
```

---

### Phase 6: Documentation

```
/README.md
```

```markdown
# Boris

A TypeScript monorepo with React frontend, Express backend, and Graphile Worker.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker

## Quick Start

```bash
# Install dependencies
pnpm install

# Start TimescaleDB
pnpm docker:up

# Copy environment variables
cp .env.example .env

# Generate and run migrations
pnpm db:generate
pnpm db:migrate

# Start all services
pnpm dev
```

## Services

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:4000 |
| Drizzle Studio | `pnpm db:studio` |

## Project Structure

```
boris/
├── apps/
│   ├── web/        # React Router + Vite
│   ├── api/        # Express backend
│   └── worker/     # Graphile Worker
└── packages/
    └── database/   # Drizzle ORM + schema
```

## Commands

```bash
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm lint             # Lint code
pnpm type-check       # Type check all packages
pnpm db:studio        # Open Drizzle Studio
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
```
```

---

## Acceptance Criteria

### Functional

- [ ] All three services start with `pnpm dev`
- [ ] Frontend displays users from the database
- [ ] API validates input with Zod and returns proper errors
- [ ] Worker validates job payloads
- [ ] Database migrations work

### Non-Functional

- [ ] TypeScript strict mode enabled
- [ ] Biome linting passes
- [ ] Hot reload works
- [ ] Graceful shutdown closes database connections

---

## ERD Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar name
        timestamp created_at
        timestamp updated_at
    }
```

---

*Generated: 2025-12-24 | Updated after review*
