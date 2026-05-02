# CLAUDE.md - Shared UI Package

## Scope

This package is for reusable UI components shared by `apps/web` and `apps/admin`.

Expected contents:
- Buttons
- Inputs
- Form controls
- Dialogs
- Tables
- Layout primitives
- Theme tokens

## Responsibilities

- Provide generic, app-neutral components.
- Keep styling consistent across frontend apps.
- Avoid business-specific behavior unless it is clearly reusable.

## Coding Rules

- Components should be typed with TypeScript.
- Components should not call application APIs directly.
- Components should not contain routing assumptions from a specific app.
- Keep accessibility in mind for focus, labels, keyboard behavior, and contrast.
- Prefer composition over highly specialized props.

## Import Rules

Allowed:

```txt
packages/types
packages/config
```

Avoid:

```txt
apps/web
apps/admin
apps/api
```
