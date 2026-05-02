# CLAUDE.md - Shared Types Package

## Scope

This package is for shared TypeScript types, DTOs, enums, schemas, and API contracts used across apps.

Expected contents:
- API request/response types
- DTO types
- Domain enums
- Validation schemas when shared by frontend and backend

## Responsibilities

- Keep frontend and backend contracts aligned.
- Reduce duplicated type definitions across `apps/web`, `apps/admin`, and `apps/api`.
- Provide app-neutral domain language.

## Coding Rules

- Do not import runtime code from apps.
- Keep types stable and explicit.
- Prefer narrow, domain-specific names over vague generic names.
- Avoid putting UI types here unless they are shared contracts.
- If using schema libraries, keep schemas portable between browser and Node runtimes.

## Import Rules

This package should have minimal dependencies.

Allowed:

```txt
packages/config
```

Avoid:

```txt
apps/*
packages/ui
```
