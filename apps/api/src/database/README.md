# Database

This API uses Drizzle ORM with PostgreSQL.

## Commands

```bash
pnpm --filter @aic/api db:create
pnpm --filter @aic/api db:setup
pnpm --filter @aic/api db:generate
pnpm --filter @aic/api db:migrate
pnpm --filter @aic/api db:seed
pnpm --filter @aic/api db:studio
```

## Environment

Set `DATABASE_URL` before running migrations or enabling modules that inject the
database provider.

Local development database:

```env
DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic
```

Docker PostgreSQL credentials:

```txt
user: sa
password: Center@123
database: aic
```

The `@` in the password must be URL-encoded as `%40` in `DATABASE_URL`.

If the PostgreSQL server contains multiple databases, run AIC migrations only
against the `aic` database.

Optional first admin seed:

```bash
DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic \
INITIAL_ADMIN_EMAIL=admin@aic.local \
INITIAL_ADMIN_PASSWORD='use-a-local-secret-at-least-12-chars' \
INITIAL_ADMIN_FULL_NAME='System Admin' \
pnpm --filter @aic/api db:seed
```

The seed hashes the password with Argon2id and assigns the user to the `admin`
group. Existing admin passwords are not overwritten unless
`INITIAL_ADMIN_RESET_PASSWORD=true`.

## Migration Rules

- Schema source lives in `src/database/schema`.
- Generated migration SQL lives in `drizzle`.
- Commit schema and migration files together.
- Do not change production databases manually without adding a migration.
- See `docs/auth-user-management.md` for the first auth/user/group-policy ERD.
