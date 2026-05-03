# Login Flow

## Purpose

This document explains the runtime login flow for the AIC admin app and API.
AI assistants should read this before changing authentication, route guards,
session handling, or admin login UI.

Related documents:

- `apps/api/docs/auth-user-management.md`
- `apps/api/CLAUDE.md`
- `apps/admin/CLAUDE.md`

## Current Strategy

Use an opaque session token stored in an httpOnly cookie.

The browser receives the raw session token only as a cookie. PostgreSQL stores
only `sha256(sessionToken)` in `user_sessions.session_token_hash`.

Default cookie and session settings are configured by API env:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AUTH_SESSION_COOKIE_NAME=aic_session
AUTH_SESSION_TTL_DAYS=7
AUTH_LOCK_MAX_ATTEMPTS=5
AUTH_LOCK_MINUTES=15
```

When admin and API run on different origins in local development, API CORS must
allow the admin origin and credentials. Do not use wildcard CORS with cookies.

## Actors

- Admin user: internal user who signs in to the admin app.
- Admin app: Next.js frontend in `apps/admin`.
- API: NestJS + Fastify backend in `apps/api`.
- PostgreSQL: durable source of truth for users, sessions, groups, policies,
  permissions, and menus.

## Endpoint Contract

Implemented endpoints:

```txt
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

All API responses use the global response envelope:

```ts
type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
  };
};

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

### Login Request

```http
POST /api/auth/login
content-type: application/json

{
  "email": "admin@aic.local",
  "password": "..."
}
```

Success:

- returns `201`
- sets `Set-Cookie: aic_session=...; HttpOnly; SameSite=Lax; Path=/`
- response `data` includes current user, groups, permissions, menus, and
  session expiry

### Current Session Request

```http
GET /api/auth/me
cookie: aic_session=...
```

Success:

- returns `200`
- response `data` includes current user, groups, permissions, menus, and
  session expiry

Anonymous, revoked, expired, inactive, deleted, or locked users:

- returns `401`

### Logout Request

```http
POST /api/auth/logout
cookie: aic_session=...
```

Success:

- revokes the matching session by setting `user_sessions.revoked_at`
- clears the session cookie
- returns `{ loggedOut: true }`

## Successful Login Flow

```txt
Admin opens /login
  -> Admin app checks /api/auth/me
  -> if authenticated, redirect to dashboard
  -> if anonymous, show login form

Admin submits email/password
  -> POST /api/auth/login
  -> API normalizes email to lowercase
  -> API finds non-deleted user by email
  -> API checks user status and lock state
  -> API verifies password with Argon2id
  -> API creates random opaque session token
  -> API stores sha256(sessionToken) in user_sessions
  -> API resets failed_login_attempts and locked_until
  -> API updates users.last_login_at
  -> API calculates effective access:
       users
       -> group_members
       -> active groups
       -> group_policies
       -> active policies
       -> policy_permissions
       -> permissions
       -> policy_menus
       -> active, non-deleted menus
  -> API returns data and httpOnly cookie
  -> Admin app stores session data in TanStack Query cache
  -> Admin app redirects to dashboard
  -> Dashboard renders allowed menu tree and actions
```

## Admin Route Guard Flow

The admin app should treat session state as three explicit states:

```txt
loading
authenticated
anonymous
```

Recommended behavior:

```txt
Protected route loads
  -> query /api/auth/me with credentials included
  -> loading: render a stable loading shell
  -> authenticated: render route content
  -> anonymous: redirect to /login with optional next path
```

Login route behavior:

```txt
/login loads
  -> query /api/auth/me
  -> authenticated: redirect to dashboard or next path
  -> anonymous: render login form
```

Do not protect admin pages only by hiding links. The API must enforce
permissions on every protected endpoint.

## Failed Login Flow

```txt
POST /api/auth/login with invalid credentials
  -> API returns 401 with generic message
  -> API does not reveal whether email exists
  -> if user exists, increment failed_login_attempts
  -> if attempts reach AUTH_LOCK_MAX_ATTEMPTS, set:
       status = locked
       locked_until = now + AUTH_LOCK_MINUTES
  -> Admin app shows generic invalid credentials message
```

Generic error message:

```txt
Invalid email or password.
```

Locked account message:

```txt
Account is temporarily locked. Please try again later.
```

## Logout Flow

```txt
Admin clicks logout
  -> POST /api/auth/logout
  -> API revokes current session
  -> API clears cookie
  -> Admin app clears TanStack Query cache
  -> Admin app redirects to /login
```

Logout should be safe to call even when the current cookie is missing or already
revoked.

## Session Expiry And Revocation

`/api/auth/me` must reject a session when:

- cookie is missing
- session token hash is not found
- `revoked_at` is not null
- `expires_at` is in the past
- user is deleted
- user status is not `active`

When a session is valid, API updates `user_sessions.last_seen_at`.

## Menu And Permission Shape

`/api/auth/login` and `/api/auth/me` return effective access in the same shape:

```ts
type AuthSessionPayload = {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: 'active' | 'inactive' | 'locked';
    lastLoginAt: string | null;
  };
  groups: Array<{
    code: string;
    name: string;
  }>;
  permissions: string[];
  menus: AuthMenu[];
  expiresAt: string;
};

type AuthMenu = {
  id: string;
  code: string;
  label: string;
  path: string | null;
  icon: string | null;
  level: number;
  sortOrder: number;
  children: AuthMenu[];
};
```

Admin UI should use:

- `menus` for navigation
- `permissions` for button/action visibility
- `groups` for display and audit context only

Do not hardcode authorization behavior from group names in frontend UI.

## Admin Implementation Plan

When implementing admin login, create or update these areas:

```txt
apps/admin/app/(auth)/login/page.tsx
apps/admin/app/(dashboard)/layout.tsx
apps/admin/src/features/auth-login/
apps/admin/src/entities/session/
apps/admin/src/shared/api/api-client.ts
apps/admin/src/shared/lib/auth.ts
apps/admin/src/shared/lib/routes.ts
```

Current implementation follows this structure.

Recommended module responsibilities:

- `entities/session`: typed `/auth/me` and logout calls, session hooks, session
  types.
- `features/auth-login`: login form schema, mutation, submit behavior, and form
  UI.
- `shared/api/api-client.ts`: always send credentials for API calls.
- `shared/lib/auth.ts`: helpers for redirect and session state decisions.
- Dashboard layout: session guard and shell composition.

## Security Rules

- Never store raw passwords.
- Never store raw session tokens in PostgreSQL.
- Never log passwords, cookies, authorization headers, or raw session tokens.
- Use httpOnly cookies for browser sessions.
- Use `secure=true` cookies in production.
- Keep error messages generic for invalid credentials.
- Enforce authorization in API endpoints, not only in frontend UI.
- Add audit logging for login success, login failure, logout, password reset,
  and account lock before production.

## Test Cases

API tests should cover:

- successful login sets cookie and creates session
- login with wrong password returns 401
- repeated failed login locks account
- `/auth/me` returns user, groups, permissions, and menu tree
- `/auth/me` rejects missing, revoked, expired, and invalid sessions
- logout revokes session and clears cookie

Admin tests should cover:

- anonymous user sees login page
- authenticated user is redirected away from login page
- protected dashboard redirects anonymous user to login
- successful login redirects to dashboard
- logout clears session cache and redirects to login
