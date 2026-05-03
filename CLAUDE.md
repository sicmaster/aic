# CLAUDE.md - AIC Project Rules

## Purpose

AIC is a pnpm + Turborepo monorepo for a multi-app system.

The admin app and API are the first priority. The public web app can be built
later after the core business workflows and contracts are stable.

Any AI assistant or contributor should read this file first, then read the
nearest `CLAUDE.md` inside the app or package they are changing.

## Monorepo Structure

```txt
apps/
  admin/    # authenticated admin app and internal workflows
  api/      # backend API service
  web/      # public website and SEO pages
packages/
  config/   # shared TypeScript, lint, formatting, and tooling config
  types/    # shared DTOs, API contracts, enums, and schemas
  ui/       # shared app-neutral UI components
```

## Current Build Priority

Build in this order unless the user explicitly changes priority:

1. `apps/api` foundation and domain contracts.
2. `apps/admin` foundation and operational screens.
3. Shared contracts in `packages/types`.
4. Shared reusable UI in `packages/ui`.
5. `apps/web` public pages.

Do not start with marketing/public web work while the admin and API foundation
are still missing.

## Backend Stack Decision

Use NestJS with the Fastify adapter for the core API.

Chosen API stack:

```txt
Runtime/framework: Node.js + NestJS + Fastify
Language: TypeScript
Database: PostgreSQL
ORM/query layer: Drizzle ORM
Cache/session/rate-limit: Redis when enabled by env
Logging: Pino/nestjs-pino with LOG_LEVEL
Contracts: packages/types
```

Why this stack:

- Keeps the admin, web, API, and shared contracts in one TypeScript monorepo.
- Improves maintainability for a TypeScript-focused team.
- Allows DTOs and API contracts to be shared through `packages/types`.
- Provides clear backend architecture through Nest modules, providers, guards,
  pipes, filters, and interceptors.
- Fastify gives better HTTP performance than the default Express adapter while
  preserving NestJS productivity.

Do not switch the core API to .NET, Go, Python, or another backend stack unless
the user explicitly reopens the architecture decision.

Future high-throughput or CPU-heavy workloads may be split into separate worker
or service processes later. The core admin/web API remains NestJS + Fastify.

## Project-Wide Rules

- Keep apps independent from deployment routing. Source code must work with
  either subdomain-based or path-based deployment.
- Do not hardcode production URLs, secrets, tokens, database credentials, or
  deployment paths.
- Use environment variables for runtime configuration.
- Keep shared request/response contracts in `packages/types` when more than one
  app or service needs them.
- Keep generic visual components in `packages/ui`.
- Keep app-specific workflows inside the app that owns them.
- Avoid circular dependencies between apps and packages.
- Prefer explicit, boring, maintainable architecture over clever abstractions.

## Import Boundaries

Allowed direction:

```txt
apps/*          -> packages/*
packages/ui     -> packages/types, packages/config
packages/types  -> packages/config
packages/config -> tooling dependencies only
```

Forbidden direction:

```txt
packages/* -> apps/*
apps/web   -> apps/admin
apps/web   -> apps/api implementation files
apps/admin -> apps/api implementation files
apps/api   -> apps/web or apps/admin UI code
```

Frontend apps must communicate with the API over HTTP clients, not by importing
backend implementation code.

## App Responsibilities

### `apps/api`

The API owns authentication, authorization enforcement, domain logic, database
access, background jobs, integrations, and server-side validation.

Use the API folder rules in `apps/api/CLAUDE.md`.

### `apps/admin`

The admin app owns authenticated operational UI: dashboards, CRUD screens,
approval flows, reports, and internal tools.

Use the admin folder rules in `apps/admin/CLAUDE.md`.

### `apps/web`

The public web app owns public, SEO-friendly pages and unauthenticated
marketing/content surfaces.

Use the web folder rules in `apps/web/CLAUDE.md`.

## Shared Package Responsibilities

### `packages/types`

Use for app-neutral DTOs, API contracts, enums, and shared schemas. Do not put
UI-only or app-specific implementation details here.

### `packages/ui`

Use for generic, reusable, app-neutral UI components. Do not put business
workflow components or API calls here.

### `packages/config`

Use for shared tooling configuration only. Do not put runtime application logic
or secrets here.

## API And Contract Rules

- Define stable request and response shapes before wiring complex UI.
- Keep DTO names explicit and domain-oriented.
- Mirror shared contracts through `packages/types` when admin and API both need
  them.
- Normalize API errors into a consistent shape before they reach screens.
- Enforce permissions in the API. Frontend permission checks are only for UX.
- API success responses use `{ success: true, data, meta? }`.
- API error responses use `{ success: false, error: { code, message,
fieldErrors? }, meta? }`.
- Paginated responses keep items in `data.items` and pagination details in
  `meta.pagination`.

## Database And Migration Rules

- Local development database name is `aic`.
- Local Docker PostgreSQL user is `sa` and password is `Center@123`.
- Encode the password as `Center%40123` inside `DATABASE_URL`.
- API database schema source lives in `apps/api/src/database/schema`.
- Drizzle migration SQL and snapshots live in `apps/api/drizzle`.
- Commit schema and generated migration files together.
- Use `pnpm --filter @aic/api db:create` to create the configured database when
  needed.
- Use `pnpm --filter @aic/api db:generate` after schema changes.
- Use `pnpm --filter @aic/api db:migrate` to apply migrations.
- Auth, user management, group policy flow, user stories, and ERD are documented
  in `apps/api/docs/auth-user-management.md`.
- Only run this project's migrations against the `aic` database. Do not run AIC
  migrations against other databases in the same PostgreSQL server.

## Frontend Rules

- Internal admin UI should be dense, clear, and task-focused.
- Public web UI can be more editorial and SEO-focused.
- Use route-level layouts for app shells.
- Keep page files small and compose feature components.
- Keep server state in TanStack Query when used by the app.
- Keep form validation close to the feature unless the schema is shared with the
  API.

## Environment Rules

Each app should provide its own `.env.example` for required variables.

Examples:

```env
PORT=3001
DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AUTH_SESSION_COOKIE_NAME=aic_session
AUTH_SESSION_TTL_DAYS=7
AUTH_LOCK_MAX_ATTEMPTS=5
AUTH_LOCK_MINUTES=15
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_BASE_PATH=
```

Never commit real `.env` files. `.env.example` files should remain committed.

## Logging And Observability

- Use structured JSON logs in server/runtime code.
- Logs should include request id or correlation id when available.
- Log level must be controlled by environment configuration such as `LOG_LEVEL`.
- Never log passwords, tokens, cookies, secrets, full authorization headers,
  personal identifiers beyond what is needed for operations, or raw request
  bodies that may contain sensitive data.
- Use consistent levels: `debug`, `info`, `warn`, `error`, and `fatal`.
- Recommended defaults: `debug` for local development, `info` for staging and
  production, and `warn` for noisy workers or maintenance scripts.
- Runtime code should not hardcode a log level except as a fallback default.
- Log business/audit events separately from debugging logs when the event is
  needed for accountability.
- Prefer explicit context fields over string interpolation so logs are searchable
  in production.
- Frontend apps should report unexpected runtime errors through a single
  reporting boundary instead of scattered `console.error` calls.

## Authentication Rules

- Use Argon2id for password hashing and store hashes only.
- Use opaque session tokens for admin login; store only token hashes in
  PostgreSQL.
- Browser clients should use httpOnly cookies. Tooling may use bearer session
  tokens only where explicitly supported.
- Failed login attempts must be counted and should temporarily lock accounts.
- Current user responses may include effective groups, permission codes, and
  allowed menu tree.
- Initial admin creation must be driven by local env variables and never by a
  committed password.

## Redis Rules

Redis is optional infrastructure. Add it only when a real use case exists.

Good Redis use cases:

- session storage
- cache for expensive reads
- rate limiting
- short-lived locks
- background job queues
- idempotency keys

Redis rules:

- PostgreSQL remains the source of truth for durable business data.
- Redis must be enabled by configuration, for example `REDIS_ENABLED=true`, and
  must have a valid `REDIS_URL`.
- At startup, check whether Redis is configured and reachable before using it.
- Every cache key must have a clear owner, prefix, and TTL unless there is a
  documented reason not to expire it.
- Cache invalidation must be designed with the write path before adding cache.
- Do not hide correctness problems behind cache.
- For cache-only use cases, if Redis is disabled or unreachable, read directly
  from PostgreSQL or the source service and log a `warn` once per failure window.
- Redis failures should degrade gracefully for non-critical cache reads.
- For critical use cases such as sessions, queues, locks, or rate limiting,
  define whether the feature fails closed or fails open before implementation.
- Use environment variables for Redis configuration and never hardcode Redis
  credentials.

## Deployment Rules

Code structure is independent from public routing.

Supported deployment concepts:

```txt
www.domain.com   -> apps/web
app.domain.com   -> apps/admin
api.domain.com   -> apps/api
```

or:

```txt
domain.com/       -> apps/web
domain.com/admin  -> apps/admin
domain.com/api    -> apps/api
```

Routing belongs to Nginx, API Gateway, Ingress, Load Balancer, hosting config,
or container orchestration. Avoid baking those assumptions into app logic.

## Development Workflow

Before changing code:

1. Read this file.
2. Read the nearest folder-specific `CLAUDE.md`.
3. Inspect existing package scripts and local patterns.
4. Make the smallest useful change.
5. Run the most relevant check available.

Common commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Prefer filtered commands when working on one package:

```bash
pnpm --filter @aic/api typecheck
pnpm --filter @aic/admin typecheck
```

## Git And Generated Files

- Do not commit `node_modules`, build outputs, Turbo cache, coverage, logs, or
  real env files.
- Commit source code, lockfiles, migration files, `.env.example`, and project
  documentation.
- Do not rewrite unrelated user changes.
- Keep generated artifacts out of source control unless they are required for
  deployment or database migration history.

## Testing Expectations

Add tests when touching risky behavior:

- authentication and authorization
- API contract mapping
- permission helpers
- form schemas
- API client error normalization
- database queries and migrations
- critical admin workflows

Project-wide coverage baseline:

- Admin frontend: at least 80% lines/statements/functions and 75% branches.
- API backend: at least 85% lines/statements/functions and 80% branches.
- Critical auth, authorization, permission, API client, validation, and business
  rule paths should target at least 90%.
- Prefer meaningful behavior tests over superficial snapshots or coverage-only
  tests.

If tests are not available yet, run typecheck/build and document what was not
verified.

## Documentation Rules

Update documentation when architecture, commands, environment variables, or
folder responsibilities change.

Keep root documentation concise. Put detailed implementation rules in the
nearest folder-specific `CLAUDE.md`.
