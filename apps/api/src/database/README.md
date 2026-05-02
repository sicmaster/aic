# Database

This API uses Drizzle ORM with PostgreSQL.

## Commands

```bash
pnpm --filter @aic/api db:generate
pnpm --filter @aic/api db:migrate
pnpm --filter @aic/api db:studio
```

## Environment

Set `DATABASE_URL` before running migrations or enabling modules that inject the database provider.
