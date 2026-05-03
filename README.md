# AIC

AIC is structured as a pnpm + Turborepo monorepo.

## Structure

```txt
apps/
  web/      # public website / SEO
  admin/    # authenticated admin app
  api/      # backend API
packages/
  ui/       # shared UI components
  types/    # shared DTOs and API contracts
  config/   # shared TypeScript, lint, and tooling config
```

## Scripts

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
```

## Database

Local API database name:

```txt
aic
```

Recommended migration flow:

```bash
export DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic
pnpm --filter @aic/api db:create
pnpm --filter @aic/api db:generate
pnpm --filter @aic/api db:migrate
```

The local Docker PostgreSQL service uses user `sa`, password `Center@123`, and
database `aic`. The `@` in the password must be URL-encoded as `%40` in
`DATABASE_URL`.

PostgreSQL may contain multiple databases. This project must only run migrations
against the `aic` database.

Auth, user management, group policy user stories, flow, and ERD are documented
in:

```txt
apps/api/docs/auth-user-management.md
```

## Deployment Concept

Code structure is independent from deployment routing. The apps can be mapped by subdomain or path using Nginx, API Gateway, Ingress, Load Balancer, or hosting config.

```txt
www.domain.com   -> apps/web
app.domain.com   -> apps/admin
api.domain.com   -> apps/api
```

Or path based:

```txt
domain.com/       -> apps/web
domain.com/admin  -> apps/admin
domain.com/api    -> apps/api
```
