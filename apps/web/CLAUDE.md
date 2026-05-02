# CLAUDE.md - Public Web App

## Scope

This folder is for the public website, landing pages, SEO pages, documentation pages, and any content that should be indexed by search engines.

Recommended stack:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Shared UI from `packages/ui`
- Shared types from `packages/types`

## Responsibilities

- Public pages such as home, landing, product, article, help, and marketing pages.
- SEO metadata, Open Graph images, sitemap, robots config, and structured data.
- Public-facing layouts that do not require authentication by default.

## Routing / Deployment

This app must not assume a fixed production domain.

It should be deployable as either:

```txt
www.domain.com
```

or:

```txt
domain.com/
```

Domain and path mapping should be handled by Nginx, API Gateway, Ingress, Load Balancer, or hosting config.

## Environment

Use environment variables for external endpoints:

```env
NEXT_PUBLIC_API_URL=https://api.domain.com
```

Do not hardcode production URLs in source code.

## Coding Rules

- Keep SEO-sensitive pages server-rendered or statically generated when practical.
- Put reusable visual components in `packages/ui` instead of duplicating them locally.
- Put shared API response/request types in `packages/types`.
- Keep web-specific page logic in this app.
- Avoid importing from `apps/admin` or `apps/api`.
