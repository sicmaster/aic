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
    app/
      providers.tsx
    components/
      layout/
      navigation/
      feedback/
    config/
      env.ts
      navigation.ts
    features/
      auth/
        api.ts
        hooks.ts
        schemas.ts
        types.ts
        components/
      users/
        api.ts
        hooks.ts
        schemas.ts
        types.ts
        components/
    lib/
      api-client.ts
      auth.ts
      permissions.ts
      query-client.ts
      routes.ts
      utils.ts
    styles/
      globals.css
```

Use feature folders for real workflows. A feature owns its list/detail/form
components, validation schemas, local types, and API hook wrappers.

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
```

For path-based deployment:

```env
NEXT_PUBLIC_API_URL=https://domain.com/api
NEXT_PUBLIC_APP_BASE_PATH=/admin
```

Validate environment values in `src/config/env.ts`. Do not read
`process.env` directly throughout the app.

## API Integration

All HTTP calls should go through `src/lib/api-client.ts`.

Recommended pattern:

- `src/lib/api-client.ts` owns base URL, headers, credentials, token refresh
  behavior, and error normalization.
- `features/*/api.ts` exports typed request functions.
- `features/*/hooks.ts` wraps request functions with TanStack Query.
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

Use `src/lib/permissions.ts` for helpers such as `can(user, permission)`.
Feature components may use permission helpers for UI visibility, but the API
must still enforce all authorization rules.

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
apps. Domain-specific admin screens should stay inside `apps/admin/src/features`.

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

Normalize API errors in `src/lib/api-client.ts` into a consistent shape:

```ts
type ApiError = {
  status: number;
  code?: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
```

Feature screens should not parse raw `fetch` or Axios errors directly.

## Shared Packages

Use workspace packages deliberately:

- `packages/types`: DTOs, API contracts, enums, shared primitives.
- `packages/ui`: generic visual components with no admin business logic.
- `packages/config`: TypeScript, lint, formatting, and tooling config.

Do not create circular dependencies between apps and packages. Packages must not
import from `apps/*`.

## Testing

Start with focused tests around risky behavior:

- Permission helpers.
- API client error normalization.
- Form schemas.
- Table query param parsing.
- Critical feature workflows.

When adding end-to-end tests later, cover login, protected route redirects,
CRUD flows, and permission-specific visibility.

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
