# Auth And User Management Design

## Scope

This document defines the first database model and product flow for:

- login
- user management
- group management
- group policy management
- menu management
- permission-based authorization

The database name for local development is `aic`.

The detailed runtime login/session flow is documented separately in
`apps/api/docs/login-flow.md`.

## Migration Workflow

Use Drizzle migrations as the source of database history. Do not edit a database
manually without capturing the change in schema and migration files.

Recommended local flow:

```bash
export DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic
pnpm --filter @aic/api db:create
pnpm --filter @aic/api db:generate
pnpm --filter @aic/api db:migrate
pnpm --filter @aic/api db:seed
```

For an existing generated migration:

```bash
pnpm --filter @aic/api db:migrate
```

Rules:

- Schema source lives in `apps/api/src/database/schema`.
- Migration SQL lives in `apps/api/drizzle`.
- Commit schema changes and generated migration files together.
- Use `aic` as the database name for local development.
- Local Docker PostgreSQL uses user `sa` and password `Center@123`.
- Encode the password as `Center%40123` in `DATABASE_URL`.
- If the PostgreSQL server contains many databases, run these migrations only
  against `aic`.
- PostgreSQL is the durable source of truth.
- The seed script creates default permissions, policies, groups, menus, and can
  create the first admin user when `INITIAL_ADMIN_*` env variables are provided.

Optional first admin seed:

```bash
DATABASE_URL=postgresql://sa:Center%40123@localhost:5432/aic \
INITIAL_ADMIN_EMAIL=admin@aic.local \
INITIAL_ADMIN_PASSWORD='use-a-local-secret-at-least-12-chars' \
INITIAL_ADMIN_FULL_NAME='System Admin' \
pnpm --filter @aic/api db:seed
```

If the admin user already exists, the seed does not replace the password unless
`INITIAL_ADMIN_RESET_PASSWORD=true`.

## Access Model

Use group-based policy assignment:

```txt
User -> Group -> Policy -> Permission
                    -> Menu
```

Definitions:

- User: a person who can log in to admin.
- Group: a membership container. Start with only `admin` and `operator`.
- Policy: a reusable permission bundle such as `user-management-admin`.
- Permission: a capability string such as `users.read` or `groups.update`.
- Menu: a navigation item controlled by policy access.

Authorization rules:

- The API is the source of truth for permissions.
- Admin UI may hide buttons for UX, but every API endpoint must enforce
  permissions.
- Permissions should use `resource.action` naming.
- System groups and policies cannot be deleted; they may only be deactivated if
  the business flow allows it.
- Menus support up to three levels through `parent_id` and `level`.
- Inactive or soft-deleted menus must not appear in admin navigation.

## Initial Groups

Start with two groups only:

```txt
admin
operator
```

`admin` should receive all first-release permissions and menus. `operator`
should receive only operational read/use permissions until a workflow needs more.

## Password Policy

Store only password hashes. Never store plaintext passwords.

Recommended implementation:

- Use Argon2id for password hashing.
- Use a unique salt per password.
- Use environment-specific Argon2 parameters that are safe for production
  latency.
- Require at least 12 characters for manually set passwords.
- Require a mix of letters and numbers; allow symbols.
- Block common/known weak passwords in the application layer later.
- Use secure reset/invite flows instead of emailing passwords.
- Track failed login attempts and lock accounts temporarily after repeated
  failures.
- Audit login success, login failure, logout, password reset, and account lock.

Current implementation:

- `POST /api/auth/login` verifies Argon2id hashes and creates an opaque
  session token.
- Raw session tokens are returned only as httpOnly cookies; the database stores
  `sha256(sessionToken)`.
- Session lifetime is controlled by `AUTH_SESSION_TTL_DAYS`.
- Cookie name is controlled by `AUTH_SESSION_COOKIE_NAME`.
- Failed login lock settings are controlled by `AUTH_LOCK_MAX_ATTEMPTS` and
  `AUTH_LOCK_MINUTES`.

## Initial Permissions

Recommended permission codes for the first user management release:

```txt
users.read
users.create
users.update
users.disable
users.reset-password
groups.read
groups.create
groups.update
groups.assign-users
policies.read
policies.create
policies.update
policies.assign-permissions
audit.read
menus.read
menus.create
menus.update
menus.delete
```

## Initial Menus

Menus support three levels. The first seed should create:

```txt
setting
  setting/users
  setting/groups
  setting/policies
  setting/menus
```

Recommended records:

```txt
code: setting
label: Setting
path: /setting
level: 1

code: setting.users
label: Users
path: /setting/users
level: 2

code: setting.groups
label: Groups
path: /setting/groups
level: 2

code: setting.policies
label: Policies
path: /setting/policies
level: 2

code: setting.menus
label: Menus
path: /setting/menus
level: 2
```

Menu rules:

- Maximum depth is 3 levels.
- `parent_id` is required for level 2 and 3 menus.
- Level 1 menus should not have a parent.
- Use `sort_order` for display order.
- Sort order can be updated in bulk only for menus under the same parent/root.
  Cross-parent drag/reparenting is not part of the first implementation.
- Use `is_active=false` to hide a menu without deleting it.
- Use `deleted_at` for soft delete.
- Policies control which menus are visible through `policy_menus`.

## User Stories

### Login

As an admin user, I can log in with email and password so that I can access the
admin console.

Acceptance criteria:

- User must be active.
- Locked users cannot log in.
- Failed login attempts are tracked.
- Successful login creates a session record.
- Login, logout, and failed login should be audit-worthy events.

### View Users

As an admin with `users.read`, I can view users so that I can support internal
operations.

Acceptance criteria:

- Users can be searched by email or name.
- Users can be filtered by status.
- List endpoints are paginated.
- Deleted users are hidden by default.

Current implementation:

- API: `GET /api/users`
- Admin: `/setting/users`
- Supports `page`, `pageSize`, `search`, and `status`.
- Returns active group summaries for each user.

### Create User

As an admin with `users.create`, I can create users and assign them to groups.

Acceptance criteria:

- Email must be unique.
- New users must be assigned at least one group before they receive access.
- Password setup should be handled through a secure invite/reset flow later.
- User creation is audit logged.

Current implementation:

- API: `POST /api/users`
- API: `GET /api/users/group-options`
- Admin create panel supports manual temporary password and group assignment.
- First assignable groups are `admin` and `operator`.
- Passwords are hashed with Argon2id before storage.

Next improvement:

- Replace manual temporary password entry with secure invite/reset flow.
- Add audit log writes for create user and group assignment.

### Update User

As an admin with `users.update`, I can edit a user's profile, status, and group
assignment.

Current implementation:

- API: `GET /api/users/:id`
- API: `PATCH /api/users/:id`
- Admin: `/setting/users/:id/edit`
- Email is read-only after creation.
- Editable fields are full name, status, and groups.

### Delete User

As an admin with `users.disable`, I can remove a user from active management
screens without destroying historical data.

Current implementation:

- API: `DELETE /api/users/:id`
- Delete is soft delete using `deleted_at`.
- Deleted users are set to `inactive` and removed from group membership.
- Deleted users are hidden from list and detail endpoints.
- Users cannot delete their own account.

### Update User Groups

As an admin with `groups.assign-users`, I can assign users to groups so that
their access changes through group policies.

Acceptance criteria:

- Group assignment changes are audit logged.
- API recalculates effective permissions from active groups and policies.
- Inactive groups do not grant permissions.

### Manage Group Policies

As an admin with `policies.update` and `policies.assign-permissions`, I can
manage which permissions are included in a policy and assign policies to groups.

Acceptance criteria:

- Policy changes are audit logged.
- System policies cannot be accidentally deleted.
- Changes affect users through their group membership.

Current implementation:

- API: `GET /api/access-control/groups`
- API: `GET /api/access-control/groups/:code`
- API: `PATCH /api/access-control/groups/:code/policies`
- API: `GET /api/access-control/policies`
- API: `GET /api/access-control/permissions`
- API: `GET /api/access-control/menus`
- API: `GET /api/access-control/menus/:code`
- API: `POST /api/access-control/menus`
- API: `PATCH /api/access-control/menus/sort-order`
- API: `PATCH /api/access-control/menus/:code`
- API: `DELETE /api/access-control/menus/:code`
- Group policy assignment requires `groups.update`.
- Group and policy reads require `groups.read` / `policies.read`.
- Menu reads require `menus.read`.
- Updating `admin` group policies must keep `admin.full-access` to avoid
  accidentally locking admins out of the system.
- `PATCH /api/access-control/groups/:code/policies` replaces the full policy
  set for the group and records `assigned_by`.
- Menu create/update/delete and sort-order updates write audit logs and enforce
  level/parent rules.
- Menu sort-order updates reject mixed-parent payloads so drag-and-drop cannot
  accidentally reparent menus.
- Menu delete is soft delete and system menus cannot be deleted.

## Flow

```txt
Login
  -> validate email/password
  -> check user status and lock state
  -> create user_session
  -> return httpOnly session cookie
  -> admin loads current user
  -> API calculates permissions:
       users
       -> group_members
       -> groups
       -> group_policies
       -> policies
       -> policy_permissions
       -> permissions
       -> policy_menus
       -> menus
  -> admin renders allowed navigation/actions
```

```txt
User management
  -> admin opens users list
  -> API checks users.read
  -> admin creates/updates/disables user
  -> API checks required permission
  -> DB transaction writes change
  -> audit_logs records actor/action/entity
```

```txt
Audit logs
  -> admin opens audit logs list
  -> API checks audit.read
  -> API returns paginated audit events
  -> admin filters by search, entity type, and action
```

Current implementation:

- API: `GET /api/audit-logs`
- Admin: `/setting/audit-logs`
- Audited events include `users.create`, `users.update`, `users.delete`, and
  `groups.update-policies`.
- Audit records include actor, action, entity type/id, request id, IP address,
  user agent, metadata, and timestamp.

## ERD

```mermaid
erDiagram
  users ||--o{ user_sessions : has
  users ||--o{ group_members : belongs_to
  groups ||--o{ group_members : contains
  groups ||--o{ group_policies : has
  policies ||--o{ group_policies : assigned_to
  policies ||--o{ policy_permissions : grants
  permissions ||--o{ policy_permissions : included_in
  policies ||--o{ policy_menus : shows
  menus ||--o{ policy_menus : visible_by
  menus ||--o{ menus : parent
  users ||--o{ audit_logs : acts

  users {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar full_name
    enum status
    integer failed_login_attempts
    timestamptz locked_until
    timestamptz last_login_at
    timestamptz password_changed_at
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  user_sessions {
    uuid id PK
    uuid user_id FK
    varchar session_token_hash UK
    varchar ip_address
    text user_agent
    timestamptz expires_at
    timestamptz revoked_at
    timestamptz last_seen_at
    timestamptz created_at
  }

  groups {
    uuid id PK
    varchar code UK
    varchar name
    text description
    boolean is_system
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  policies {
    uuid id PK
    varchar code UK
    varchar name
    text description
    boolean is_system
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  permissions {
    uuid id PK
    varchar code UK
    varchar resource
    varchar action
    text description
    timestamptz created_at
  }

  group_members {
    uuid group_id PK, FK
    uuid user_id PK, FK
    timestamptz assigned_at
    uuid assigned_by FK
  }

  group_policies {
    uuid group_id PK, FK
    uuid policy_id PK, FK
    timestamptz assigned_at
    uuid assigned_by FK
  }

  policy_permissions {
    uuid policy_id PK, FK
    uuid permission_id PK, FK
    timestamptz granted_at
  }

  menus {
    uuid id PK
    uuid parent_id FK
    varchar code UK
    varchar label
    varchar path
    varchar icon
    integer level
    integer sort_order
    boolean is_active
    boolean is_system
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  policy_menus {
    uuid policy_id PK, FK
    uuid menu_id PK, FK
    timestamptz granted_at
  }

  audit_logs {
    uuid id PK
    uuid actor_user_id FK
    varchar action
    varchar entity_type
    varchar entity_id
    varchar request_id
    varchar ip_address
    varchar user_agent
    jsonb metadata
    timestamptz created_at
  }
```

## First Implementation Order

1. Generate and apply database migration.
2. Run seed script for permissions, default policies, default groups, and menus.
3. Build auth module: login, logout, current session.
4. Build users module: list, create, update, disable, group assignment.
5. Build groups and policies module.
6. Connect admin login page and user management screens.
