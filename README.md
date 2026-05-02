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
