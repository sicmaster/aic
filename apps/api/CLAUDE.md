# CLAUDE.md - Backend API

## Scope

This folder is for the backend API service.

Recommended stack:

- NestJS
- Fastify adapter via `@nestjs/platform-fastify`
- TypeScript
- PostgreSQL
- Drizzle ORM
- Redis when needed
- JWT or session-based authentication

## Stack Decision

This API uses NestJS with Fastify.

Do not use the default Express adapter for new API work. Fastify is the chosen
HTTP adapter for better throughput while keeping NestJS architecture and
developer productivity.

Do not migrate this API to .NET, Go, Python, or another backend stack unless the
user explicitly reopens the architecture decision.

Use separate workers or services later for CPU-heavy or highly specialized
throughput workloads. Keep the core admin/web API in NestJS + Fastify.

Performance guardrails:

- Keep request handlers I/O-oriented and non-blocking.
- Do not run CPU-heavy work inside the request lifecycle.
- Move long-running jobs to background workers or queues.
- Use database indexes, pagination, and bounded query limits for list endpoints.
- Use Redis only when a concrete cache/session/rate-limit/queue use case exists.
- Run load tests before production for endpoints expected to receive high
  concurrency.

## Architecture

Use NestJS modular architecture. Keep module boundaries explicit and avoid
putting business logic in `main.ts`, controllers, or global utility files.

Recommended folder structure:

```txt
apps/api/src/
  main.ts
  app.module.ts
  config/
    env.ts
  common/
    decorators/
    errors/
    filters/
    guards/
    interceptors/
    pipes/
    utils/
  database/
    schema/
    database.constants.ts
    database.module.ts
    database.provider.ts
    database.types.ts
  redis/
    redis.module.ts
    redis.service.ts
  auth/
    dto/
    auth.controller.ts
    auth.module.ts
    auth.service.ts
  health/
    health.controller.ts
    health.module.ts
    health.service.ts
  modules/
    users/
    roles/
```

Layer responsibilities:

- `main.ts`: bootstrap only. Set Fastify, global prefix, global pipes, logger,
  and process-level startup behavior.
- `config/`: environment parsing and validation. Runtime code should read env
  through `ConfigService`, not `process.env` directly.
- `common/`: app-wide Nest primitives such as guards, filters, pipes,
  interceptors, decorators, and framework-neutral helpers.
- `database/`: Drizzle setup, PostgreSQL pool, schema exports, and database
  types. Feature modules should use repositories/services rather than creating
  their own pools.
- `redis/`: optional Redis connectivity, status, and helpers. Feature modules
  must use `RedisService`; do not create Redis clients directly.
- `health/`: service readiness and dependency health checks.
- `modules/*`: domain modules. Each domain module owns its controllers,
  services, DTOs, repositories, and module-local tests.

Domain module structure:

```txt
modules/users/
  dto/
  repositories/
  users.controller.ts
  users.module.ts
  users.service.ts
  users.service.spec.ts
```

Import rules:

- Domain modules may import `common`, `config`, `database`, `redis`, and shared
  contracts from `packages/types`.
- `common`, `config`, `database`, and `redis` must not import from domain
  modules.
- Controllers call services; services own business logic; repositories own
  database queries.
- Do not inject database pools, Redis clients, or external SDKs directly into
  controllers.

## Database Design

The first auth and user-management database design is documented in:

```txt
apps/api/docs/auth-user-management.md
```

The runtime login/session flow is documented in:

```txt
apps/api/docs/login-flow.md
```

Use the local database name `aic`.

Local Docker PostgreSQL credentials:

```txt
user: sa
password: Center@123
database: aic
```

Use this connection string for local development:

```env
DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic
```

The `@` in the password must be URL-encoded as `%40`.

Only run AIC migrations against the `aic` database. The same PostgreSQL server
may contain other databases that do not belong to this project.

Migration workflow:

```bash
pnpm --filter @aic/api db:create
pnpm --filter @aic/api db:generate
pnpm --filter @aic/api db:migrate
```

Rules:

- Drizzle schema files are the source of truth for structure.
- Drizzle migration SQL is the source of truth for database history.
- Commit schema changes and generated migration files together.
- Do not manually change database structure outside migrations.
- Use `users.status` as the user activation/lock source of truth.
- Group policy authorization follows `users -> groups -> policies ->
permissions`.
- Start with only two groups: `admin` and `operator`.
- Menus are stored in the database, support up to three levels, and are assigned
  through policies.
- Menu visibility follows `users -> groups -> policies -> menus`.
- Use `is_active` to hide menus and `deleted_at` for soft delete.
- Store password hashes only. Use Argon2id when password hashing is implemented.
- Auth uses opaque session tokens over httpOnly cookies. Store only
  `user_sessions.session_token_hash`; never store raw session tokens.
- Initial admin seeding is optional and controlled by `INITIAL_ADMIN_*` env
  variables. Never commit real initial passwords.

## Auth Endpoints

First implemented auth endpoints:

```txt
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Rules:

- Login normalizes email to lowercase and verifies password with Argon2id.
- Successful login creates a `user_sessions` record and sets an httpOnly
  `AUTH_SESSION_COOKIE_NAME` cookie.
- `/auth/me` returns current user, groups, permissions, and allowed menu tree.
- Logout revokes the session and clears the cookie.
- Failed login attempts are tracked and lock the user temporarily according to
  `AUTH_LOCK_MAX_ATTEMPTS` and `AUTH_LOCK_MINUTES`.
- Endpoints may also accept `Authorization: Bearer <session-token>` for tooling
  and tests, but browser clients should use the httpOnly cookie.
- Before changing login/session behavior, read
  `apps/api/docs/login-flow.md`.

## User Management Endpoints

First implemented user-management endpoints:

```txt
GET  /api/users
GET  /api/users/group-options
POST /api/users
GET  /api/users/:id
PATCH /api/users/:id
DELETE /api/users/:id
```

Rules:

- All user-management endpoints require a valid session.
- `GET /api/users` requires `users.read`.
- `GET /api/users/group-options` and `GET /api/users/:id` require
  `users.read`.
- `POST /api/users` requires `users.create`.
- `PATCH /api/users/:id` requires `users.update`.
- `DELETE /api/users/:id` requires `users.disable`.
- User creation accepts `admin` and `operator` groups only for the first
  release.
- User creation hashes passwords with Argon2id. Replace manual password entry
  with an invite/reset flow before production.
- User delete is soft delete: set `deleted_at`, set status to `inactive`, remove
  group memberships, and hide the user from list/detail endpoints.
- Users cannot delete their own account.

## Access Control Endpoints

First implemented access-control endpoints:

```txt
GET   /api/access-control/groups
GET   /api/access-control/groups/:code
PATCH /api/access-control/groups/:code/policies
GET   /api/access-control/policies
GET   /api/access-control/permissions
GET   /api/access-control/menus
```

Rules:

- All access-control endpoints require a valid session.
- Group reads require `groups.read`.
- Group policy updates require `groups.update`.
- Policy and permission reads require `policies.read`.
- Menu reads require `menus.read`.
- `PATCH /api/access-control/groups/:code/policies` replaces the group's full
  policy set from `policyCodes`.
- The `admin` group must keep `admin.full-access`; do not remove that guard
  unless a safer super-admin recovery flow exists.
- Access-control business logic lives in `src/access-control`, separate from
  `src/users`.

## Audit Log Endpoints

First implemented audit-log endpoints:

```txt
GET /api/audit-logs
```

Rules:

- Audit log reads require `audit.read`.
- Mutating admin workflows should record audit events with actor, action,
  entity type/id, request id, IP address, user agent, and safe metadata.
- Current audited workflows include user create/update/delete and group policy
  assignment updates, plus menu create/update/delete.
- Do not write passwords, raw tokens, cookies, or sensitive request payloads to
  audit metadata.

## Menu Management Endpoints

First implemented menu-management endpoints:

```txt
GET    /api/access-control/menus
GET    /api/access-control/menus/:code
POST   /api/access-control/menus
PATCH  /api/access-control/menus/:code
DELETE /api/access-control/menus/:code
```

Rules:

- Menu reads require `menus.read`.
- Menu creation requires `menus.create`.
- Menu updates require `menus.update`.
- Menu deletion requires `menus.delete`.
- Menus support levels 1 through 3.
- Level 1 menus cannot have parents.
- Level 2 and 3 menus must reference a parent exactly one level above them.
- Delete is soft delete: set `deleted_at`, set `is_active=false`, and hide from
  active list responses.
- System menus cannot be deleted.
- Menus with active children cannot be deleted.
- Admin full-page create/edit screens live under `/setting/menus`.

## API Response And Error Standard

Controllers should return raw data objects. The global response interceptor wraps
successful responses in the shared API envelope.

Success response:

```ts
type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
  };
};
```

Error response:

```ts
type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
  meta?: {
    requestId?: string;
  };
};
```

Pagination response:

```ts
type PaginatedResponse<T> = {
  success: true;
  data: {
    items: T[];
  };
  meta: {
    requestId?: string;
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      pageCount: number;
    };
  };
};
```

Rules:

- Keep shared response types in `packages/types`.
- Do not manually wrap successful controller responses unless a low-level route
  has a documented reason to bypass the interceptor.
- Throw `AppException` or Nest `HttpException` subclasses for expected errors.
- Validation errors must use `VALIDATION_ERROR` and include `fieldErrors`.
- Unexpected errors must return `INTERNAL_SERVER_ERROR` without leaking stack
  traces or raw exception details.
- Include `requestId` in response metadata when available.

## Responsibilities

- REST or GraphQL API endpoints.
- Authentication and authorization.
- Business logic, database access, background jobs, integrations, and
  server-side validation.
- DTOs and contracts that can be exported or mirrored through `packages/types`.

## Routing / Deployment

This service must not assume a fixed public route.

It should be deployable as either:

```txt
api.domain.com
```

or:

```txt
domain.com/api
```

For local split-port development, admin and API run on different origins. Keep
CORS explicit and credential-aware:

```env
CORS_ORIGINS=http://localhost:3000
```

Do not use wildcard CORS origins with cookie-based admin sessions.

The route mapping belongs to Nginx, API Gateway, Ingress, Load Balancer, or
container orchestration config.

## Environment

Use environment variables for runtime configuration:

```env
PORT=3001
DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic
LOG_LEVEL=info
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
```

Never hardcode secrets in source code.

## Logging And Observability

Use structured logging from the start.

Recommended stack:

- `nestjs-pino` or another Pino-based NestJS logger for structured JSON logs.
- Request id or correlation id middleware/interceptor.
- Central exception filter for consistent error responses and error logs.
- Optional OpenTelemetry later for traces and metrics when deployment needs it.

Logging rules:

- Log each HTTP request with method, path, status code, latency, request id, and
  authenticated user id when available.
- Control the active log level through `LOG_LEVEL`. Do not hardcode production
  log verbosity in source code.
- Use `debug` as the local development default and `info` as the production
  default unless deployment config says otherwise.
- Validate `LOG_LEVEL` during startup. Allowed values are `debug`, `info`,
  `warn`, `error`, and `fatal`.
- Log domain events that matter for operations or auditability, such as login,
  logout, permission denial, record creation, record approval, and destructive
  actions.
- Use `debug` for development diagnostics, `info` for successful operational
  events, `warn` for recoverable problems, `error` for failed operations, and
  `fatal` for process-level failures.
- Never log passwords, tokens, cookies, secrets, full authorization headers, or
  raw payloads that may contain sensitive data.
- Include structured context fields such as `requestId`, `userId`, `module`,
  `action`, and `entityId` instead of embedding everything in message strings.
- Do not swallow errors silently. Either handle them intentionally or log and
  rethrow/return a consistent API error.

Audit logging:

- Treat audit logs as business records, not debug logs.
- Capture who did what, when, from where, and which entity was affected.
- Do not rely only on application console logs for compliance-critical audit
  history.

## Redis

Redis is optional and should be introduced only for a concrete use case.

Recommended use cases:

- Session storage when using server-side sessions.
- Rate limiting for auth and sensitive endpoints.
- Short-lived cache for expensive read models.
- Background job queues when asynchronous work is needed.
- Short-lived locks or idempotency keys for concurrency-sensitive workflows.

Rules:

- PostgreSQL remains the source of truth for durable business data.
- Redis must be controlled through environment configuration:

  ```env
  REDIS_ENABLED=false
  REDIS_URL=redis://localhost:6379
  REDIS_KEY_PREFIX=aic:dev
  ```

- If `REDIS_ENABLED=false`, do not create Redis clients and do not attempt Redis
  connections.
- If `REDIS_ENABLED=true`, validate `REDIS_URL` at startup and run a Redis
  connectivity check before marking Redis-dependent features as available.
- Expose Redis readiness through health checks. The health response should make
  it clear whether Redis is disabled, available, or unavailable.
- Keep Redis access behind modules/services, not scattered across controllers.
- Use key prefixes by domain and environment, for example
  `aic:dev:session:{id}`.
- Set TTLs for sessions, rate limits, idempotency keys, and caches.
- Design cache invalidation before adding cache to a write-sensitive workflow.
- Cache misses must fall back to source-of-truth reads.
- For cache-only reads, if Redis is disabled or unreachable, read directly from
  PostgreSQL or the source service and log a throttled `warn`.
- Non-critical cache failures should not take the API down.
- Critical Redis features such as sessions, queues, locks, idempotency, and rate
  limiting must define their failure behavior explicitly.
- Sessions and permission-sensitive rate limits should usually fail closed.
- Cache should fail open by reading from the source of truth.
- Background queues should fail loudly and expose unhealthy readiness.
- Include Redis in integration tests when behavior depends on Redis semantics.

## Testing

Use a layered testing strategy. The API is the source of truth for business
rules, authentication, authorization, validation, and persistence, so its tests
should be stricter than frontend tests.

Recommended tools:

- Jest for unit and integration tests.
- `@nestjs/testing` for Nest module, provider, guard, pipe, and controller tests.
- Supertest for HTTP endpoint tests against a Nest application instance.
- Testcontainers PostgreSQL or a dedicated test database for database
  integration tests.
- Drizzle migrations against the test database before integration and e2e test
  suites.
- Optional MSW or mocked adapters only for external HTTP integrations.

Test placement:

```txt
src/**/*.spec.ts       # unit and module tests
src/**/*.int-spec.ts   # database or integration tests
test/**/*.e2e-spec.ts  # HTTP end-to-end tests
```

Coverage targets:

- Global coverage: at least 85% lines, statements, and functions.
- Global branch coverage: at least 80%.
- Critical auth, authorization guards, permission checks, DTO validation,
  service business rules, database repositories, and API error mapping: at least
  90%.
- New or changed business logic should be covered before merging.
- Do not chase 100% coverage for framework wiring or trivial Nest module
  declarations; test behavior and risk.

Required test coverage by area:

- Controllers: request validation, status codes, response shape, and error
  mapping.
- Services: business rules, edge cases, transaction behavior, and authorization
  assumptions.
- Guards and auth: anonymous requests, invalid credentials, expired sessions or
  tokens, role/permission denial, and success paths.
- DTOs and pipes: required fields, invalid values, transform behavior, and
  whitelist/forbid behavior.
- Database layer: query filters, unique constraints, soft-delete behavior when
  used, migrations, and transaction rollback paths.
- Integrations and jobs: retries, idempotency, timeout/error handling, and
  payload mapping.

End-to-end tests should cover the API paths the admin depends on:

- Health check.
- Login/session or token creation.
- Current user/session lookup.
- Protected route denial for anonymous users.
- Permission denial for authenticated users without the required capability.
- One representative CRUD workflow for each critical domain module.

Run before merge:

```bash
pnpm --filter @aic/api typecheck
pnpm --filter @aic/api test
pnpm --filter @aic/api test:e2e
pnpm --filter @aic/api build
```

## Coding Rules

- Keep controllers thin; put business logic in services.
- Validate input with DTOs and validation pipes.
- Keep database access behind services or repositories.
- Return consistent response shapes.
- Keep shared request/response types in `packages/types` when they are used by
  frontend apps.
- Do not import UI or frontend code.
