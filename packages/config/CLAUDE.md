# CLAUDE.md - Shared Config Package

## Scope

This package is for shared development configuration.

Expected contents:
- TypeScript config
- ESLint config
- Prettier config
- Tailwind preset
- Test config helpers
- Build/lint shared settings

## Responsibilities

- Keep project-wide tooling consistent.
- Provide reusable config that apps and packages can extend.
- Avoid application runtime logic.

## Coding Rules

- Config should be explicit and easy to extend.
- Avoid app-specific assumptions unless exported as a named preset.
- Keep dependency choices conservative.
- Do not store secrets or environment-specific values here.

## Import Rules

This package should not import from apps.

Allowed:

```txt
tooling dependencies
```

Avoid:

```txt
apps/*
packages/ui
packages/types
```
