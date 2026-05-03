# CLAUDE.md - Admin Web App

## Scope

This folder is for the authenticated admin web app: dashboard, back office,
approval workflows, reports, operational tools, and internal configuration
screens.

Build this app before the public web app. Treat it as the primary client for
the API while the domain model is still evolving.

Recommended stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Shared UI from `packages/ui`
- Shared DTOs and contracts from `packages/types`

## Architecture Style

Use Feature-Sliced Design Lite (FSD-lite) adapted for Next.js App Router.

Keep Next.js `app/` focused on routing, layouts, metadata, and route-level
composition. Put reusable business UI and workflow logic under `src/`.

Use `src/views` for the FSD page-composition layer. Do not create `src/app` or
`src/pages` in this app because Next.js treats those folders as App Router and
legacy Pages Router roots.

Layer direction:

```txt
app -> views -> widgets -> features -> entities -> shared
```

Higher layers may import lower layers. Lower layers must not import higher
layers.

Examples:

- `features/user-create` may import `entities/user` and `shared/*`.
- `widgets/user-table` may import `features/user-filter`, `entities/user`, and
  `shared/*`.
- `entities/user` may import `shared/api`, `shared/lib`, and shared types.
- `shared/*` must not import from `entities`, `features`, `widgets`, `views`, or
  `app`.

Use FSD pragmatically. Do not create empty layers or abstractions before they
serve a real screen or workflow.

## Architecture Goals

- Keep pages thin. Pages compose feature components and route-level layout only.
- Keep business workflows inside feature modules, not global components.
- Keep API access behind typed client functions and hooks.
- Keep shared UI generic; do not move domain-heavy admin screens into
  `packages/ui`.
- Make authentication, authorization, and route protection explicit.
- Prefer boring, predictable admin UX over marketing-style composition.

## Suggested Folder Structure

Start with this structure when scaffolding the app:

```txt
apps/admin/
  app/
    (auth)/
      login/
        page.tsx
    (dashboard)/
      layout.tsx
      page.tsx
      users/
        page.tsx
    api/
      auth/
        route.ts
  src/
    views/
      dashboard/
        ui/
      users/
        ui/
    widgets/
      app-sidebar/
      app-header/
      user-table/
    features/
      auth-login/
        api.ts
        hooks.ts
        schemas.ts
        types.ts
        ui/
      user-create/
        api.ts
        hooks.ts
        schemas.ts
        types.ts
        ui/
      user-filter/
        model.ts
        ui/
    entities/
      user/
        api.ts
        hooks.ts
        schemas.ts
        types.ts
        ui/
      permission/
        types.ts
        lib.ts
    shared/
      api/
        api-client.ts
        errors.ts
      config/
        env.ts
        navigation.ts
      lib/
        auth.ts
        permissions.ts
        query-client.ts
        routes.ts
        utils.ts
      providers/
        providers.tsx
      ui/
        empty-state.tsx
        error-state.tsx
    styles/
      globals.css
```

Use feature folders for real workflows. A feature owns its action-specific UI,
validation schemas, local types, and mutation/query wrappers. Use entity folders
for domain-specific data access, schemas, types, and reusable entity UI.

## Routing

Use route groups to separate unauthenticated and authenticated screens:

```txt
app/(auth)       -> login, forgot password, callback screens
app/(dashboard)  -> protected admin shell and internal pages
```

Do not hardcode deployment assumptions into source code. The same build should
work behind either:

```txt
app.domain.com
```

or:

```txt
domain.com/admin
```

If path-based deployment is required, configure `basePath` and asset prefix at
build/deploy time.

## Environment

Use environment variables for runtime configuration:

```env
NEXT_PUBLIC_API_URL=https://api.domain.com
NEXT_PUBLIC_APP_BASE_PATH=
NEXT_PUBLIC_LOG_LEVEL=info
```

For path-based deployment:

```env
NEXT_PUBLIC_API_URL=https://domain.com/api
NEXT_PUBLIC_APP_BASE_PATH=/admin
NEXT_PUBLIC_LOG_LEVEL=info
```

Validate environment values in `src/shared/config/env.ts`. Do not read
`process.env` directly throughout the app.

## API Integration

All HTTP calls should go through `src/shared/api/api-client.ts`.

Recommended pattern:

- `src/shared/api/api-client.ts` owns base URL, headers, credentials, token
  refresh behavior, and error normalization.
- `entities/*/api.ts` exports entity-level typed request functions.
- `entities/*/hooks.ts` wraps common entity queries with TanStack Query.
- `features/*/api.ts` exports workflow-specific request functions when needed.
- `features/*/hooks.ts` wraps workflow-specific mutations or query composition.
- Shared request/response contracts live in `packages/types` when used by more
  than one app or service.

Avoid importing backend implementation files from `apps/api`. Admin talks to the
API over HTTP only.

## Data Fetching

Use TanStack Query for server state:

- Query keys must be stable and colocated with the feature.
- Mutations should invalidate or update only affected queries.
- Keep pagination, search, sorting, and filters in the URL when they define the
  visible table state.
- Prefer server-side pagination for operational tables.

Do not store server state in React Context unless it is truly global session
state.

## Authentication

The app should support one clear authentication strategy:

- Prefer secure, httpOnly cookie sessions when admin and API can share a parent
  domain.
- Use bearer tokens only when cookie sessions are not practical for deployment.

Before implementing or changing login/session behavior, read:

```txt
apps/api/docs/login-flow.md
```

Required pieces:

- Login page under `app/(auth)/login`.
- Protected dashboard layout under `app/(dashboard)/layout.tsx`.
- Session loader that can tell `authenticated`, `anonymous`, and `loading`
  states apart.
- Explicit redirect behavior for anonymous users.
- Logout mutation that clears local query cache and server session/token.

Do not hide protected UI only with client-side checks. Enforce authorization in
the API as well.

## Authorization

Model permissions as explicit capabilities, not scattered role-name checks.

Example:

```ts
type Permission = 'users.read' | 'users.create' | 'users.update' | 'reports.read';
```

Use `src/shared/lib/permissions.ts` for helpers such as
`can(user, permission)`.
Feature components may use permission helpers for UI visibility, but the API
must still enforce all authorization rules.

Implemented access screens:

- `/setting/users` lists users and links to full-page create/edit screens.
- `/setting/groups` lists groups and their assigned policies.
- `/setting/groups/:code/edit` edits the full policy set for a group.
- `/setting/policies` shows read-only policy details, permissions, and menus.
- `/setting/audit-logs` lists audit events with filters and pagination.
- `/setting/menus` lists menu records with active/system status.
- `/setting/menus/create` and `/setting/menus/:code/edit` manage menu records
  through full-page forms.
- Create, edit, delete, and policy-save success states should use
  `src/shared/ui/feedback-dialog.tsx`.
- Avoid modal forms for create/edit workflows because admin records may grow
  into larger forms. Use full pages for create/edit and reserve modals for
  confirmation/feedback.
- Access-control API calls live in `src/entities/access-control`.

## UI Principles

This is an internal tool. Design for speed, clarity, and repeated use:

- Use a persistent sidebar or top-level navigation for primary modules.
- Use compact tables, filters, tabs, segmented controls, and clear form sections.
- Keep dashboards information-dense but readable.
- Avoid marketing heroes, decorative cards, oversized typography, and purely
  ornamental visuals.
- Prefer clear empty states and actionable error states.
- Keep page headings, breadcrumbs, and primary actions consistent.

Use components from `packages/ui` only when they are generic and reusable across
apps. Domain-specific admin screens should stay inside `apps/admin/src/views`,
`apps/admin/src/widgets`, `apps/admin/src/features`, or
`apps/admin/src/entities`.

## Forms

Use React Hook Form for non-trivial forms and Zod for validation:

- Put feature validation schemas in `features/*/schemas.ts`.
- Reuse DTO-compatible schemas when they mirror API contracts.
- Show field-level validation errors.
- Disable submit while pending.
- Handle API validation errors and map them back to fields when possible.

## Tables And Lists

Operational tables should support the basics from the start:

- Search
- Filter
- Sort
- Pagination
- Loading state
- Empty state
- Error state
- Row-level actions
- Permission-aware primary actions

For large datasets, keep table state in the URL and fetch from the server using
query params.

## Error Handling

Normalize API errors in `src/shared/api/api-client.ts` into a consistent shape:

```ts
type ApiError = {
  status: number;
  code?: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
```

Feature screens should not parse raw `fetch` or Axios errors directly.

## Logging And Error Reporting

Keep client-side logging intentional and centralized.

Recommended pattern:

- Use a global error boundary for unexpected runtime failures.
- Use a single reporting adapter under `src/shared/lib/error-reporting.ts` when
  integrating Sentry, OpenTelemetry, or another monitoring provider later.
- Control client diagnostics through environment configuration such as
  `NEXT_PUBLIC_LOG_LEVEL`.
- Do not hardcode verbose client logging in production builds.
- Report unexpected errors with route, feature name, request id, and user id
  when safely available.
- Do not report passwords, tokens, cookies, authorization headers, or raw form
  values.
- Avoid scattered `console.log` or `console.error` in feature code. Use the
  shared reporting adapter or local development-only diagnostics.
- User-facing error messages should stay clear and safe; detailed diagnostics
  belong in logs or monitoring.

## Shared Packages

Use workspace packages deliberately:

- `packages/types`: DTOs, API contracts, enums, shared primitives.
- `packages/ui`: generic visual components with no admin business logic.
- `packages/config`: TypeScript, lint, formatting, and tooling config.

Do not create circular dependencies between apps and packages. Packages must not
import from `apps/*`.

## Testing

Use a layered testing strategy. Keep tests close to the layer they protect.

Recommended tools:

- Vitest for unit and integration-style frontend tests.
- React Testing Library for component behavior.
- MSW for mocking API responses at the network boundary.
- Playwright for browser end-to-end tests.
- `@testing-library/jest-dom` matchers for DOM assertions.
- `axe-core` or Playwright accessibility checks for critical screens when
  practical.

Test placement:

```txt
src/shared/**/*.test.ts
src/entities/**/*.test.ts
src/features/**/*.test.tsx
src/widgets/**/*.test.tsx
e2e/**/*.spec.ts
```

Coverage targets:

- Global unit/component coverage: at least 80% lines, statements, and functions.
- Global branch coverage: at least 75%.
- Critical auth, permissions, API client, env parsing, form schemas, and query
  param parsing: at least 90%.
- New or changed business logic should be covered before merging.
- Do not chase 100% coverage for visual-only markup; test behavior and risk.

Required test coverage by area:

- `src/shared/api`: request building, credentials behavior, error normalization,
  and validation error mapping.
- `src/shared/config`: env parsing and missing/invalid env behavior.
- `src/shared/lib/permissions.ts`: positive and negative permission cases.
- `src/entities/*`: entity schemas, query key builders, API mappers, and reusable
  entity helpers.
- `src/features/*`: form validation, submit behavior, mutation success/error
  states, and permission-aware action visibility.
- `src/widgets/*`: table state, filters, pagination, empty state, loading state,
  and error state.

End-to-end tests should cover the happy path and the highest-risk permission
paths:

- Login.
- Anonymous users are redirected away from protected routes.
- Authenticated users can open the dashboard.
- Permission-restricted actions are hidden or blocked.
- One representative CRUD workflow for each critical domain module.

Run before merge when the admin app exists:

```bash
pnpm --filter @aic/admin typecheck
pnpm --filter @aic/admin test
pnpm --filter @aic/admin test:e2e
pnpm --filter @aic/admin build
```

## Coding Rules

- Use TypeScript in strict mode.
- Use absolute imports if configured by `tsconfig`.
- Keep route files small.
- Keep feature modules cohesive.
- Prefer named exports for shared functions and components.
- Do not mix admin domain logic into `packages/ui`.
- Do not call `fetch` directly from random components.
- Do not hardcode public API URLs, secrets, or deployment paths.
- Keep visible text and validation messages ready for Thai/English localization
  if bilingual support becomes a requirement.
