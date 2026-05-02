# CLAUDE.md - Backend API

## Scope

This folder is for the backend API service.

Recommended stack:
- NestJS
- TypeScript
- PostgreSQL
- Prisma or Drizzle
- Redis when needed
- JWT or session-based authentication

## Responsibilities

- REST or GraphQL API endpoints.
- Authentication and authorization.
- Business logic, database access, background jobs, integrations, and server-side validation.
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

The route mapping belongs to Nginx, API Gateway, Ingress, Load Balancer, or container orchestration config.

## Environment

Use environment variables for runtime configuration:

```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/app
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
```

Never hardcode secrets in source code.

## Coding Rules

- Keep controllers thin; put business logic in services.
- Validate input with DTOs and validation pipes.
- Keep database access behind services or repositories.
- Return consistent response shapes.
- Keep shared request/response types in `packages/types` when they are used by frontend apps.
- Do not import UI or frontend code.
