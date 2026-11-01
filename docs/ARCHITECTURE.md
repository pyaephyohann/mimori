# Architecture

Mimori is a PWA-first Next.js application. No product feature has been implemented yet; only a design-system foundation exists. This document records that foundation, the intended structure and the questions still open. Anything not decided is marked `TBD`.

## Current state

| Area | State |
| ---- | ----- |
| Application code | Next.js App Router scaffold with a single placeholder page (`app/`). |
| Routing | App Router (`app/layout.tsx`, `app/page.tsx`). No product routes exist. |
| UI components | None beyond the root layout. |
| Design system | Colour, status and typography tokens centralized in `app/globals.css`; Roboto/Caveat loaded in `app/layout.tsx`. See [Design system](#design-system). |
| Data layer | None. Prisma and PostgreSQL are confirmed choices but are not integrated. |
| Authentication | None. |
| PWA layer | None. No manifest, service worker or install configuration exists. |
| Background jobs | None. |
| Deployment | `TBD`. |

## Intended shape (to be refined as the project grows)

The expected layering, subject to confirmation as each layer is built:

```text
Browser / installed PWA
        │
        ▼
Next.js application
  ├── routing and page composition (App Router)
  ├── UI components
  ├── server-side data access
  └── route handlers / server actions for mutations
        │
        ▼
Prisma
        │
        ▼
PostgreSQL
```

Every layer above is `TBD` in its details. The diagram describes the confirmed technology direction only.

## Design system

All design tokens live in `app/globals.css`, in four layers:

1. **Brand palette** — `--brand-hot-pink` (page background), `--brand-rose-pink`, `--brand-candy-pink`, `--brand-deep-candy-pink`, `--brand-soft-white`, `--brand-blush-pink`, `--brand-warm-charcoal`, `--brand-dusty-rose`, `--brand-white`. Fixed HEX values, identical in both themes.
2. **Semantic roles** — `--background`, `--surface`, `--surface-muted`, `--border`, `--heading`, `--foreground`, `--muted-foreground`, `--primary`, `--primary-hover`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--ring`. These are re-mapped for the dark theme, with one exception: `--background` is Hot Pink `#FF69B4` in both themes ([D-010](DECISIONS.md)). Dark-theme text tokens are tuned for the dark surfaces, not for that background — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
3. **Status families** — `success`, `warning`, `danger`, `info`, `neutral`, each with a foreground, `-surface` and `-border` token.
4. **Typography** — `--font-body` (Roboto) and `--font-script` (Caveat).

Tailwind's `@theme inline` block maps every token, so `bg-surface`, `text-heading`, `border-border`, `text-success`, `bg-success-surface` and `font-decorative` resolve to whichever variables the active theme defines. Fonts are self-hosted by `next/font` in `app/layout.tsx`.

Component conventions:

- Use semantic tokens in components; reach for `--brand-*` only where the exact brand colour must survive both themes.
- Never hardcode colour values in a component — add a token instead.
- Caveat is opt-in through `font-decorative`, only for short decorative text.

Theme handling: light and dark are selected by `prefers-color-scheme`, and `color-scheme` is set so native controls match. There is no switcher UI. A future switcher only needs to override the semantic variables on `:root` or a `[data-theme]` attribute; components stay unchanged.

Known contrast constraints of the fixed palette are listed in [KNOWN_ISSUES.md](KNOWN_ISSUES.md); decisions are recorded in [D-007](DECISIONS.md) and [D-008](DECISIONS.md).

## Pending architecture decisions

| Topic | Question | Status |
| ----- | -------- | ------ |
| Rendering model | Which routes are server-rendered, static, or client-rendered? | TBD |
| Data access boundary | Server Components only, route handlers, server actions, or a mix? | TBD |
| Mutations | Which mechanism is used for writes, and how are they validated? | TBD |
| State management | Local React state only, or a client store? | TBD |
| Authentication and session handling | Provider, session strategy, protected-route strategy. | TBD |
| Media storage | Object storage vs. database, upload pipeline, transformations. | TBD |
| PWA configuration | Manifest, icons, service worker strategy, install prompts. | TBD |
| Offline behaviour | Required or not — not a confirmed feature. | TBD |
| Caching | Next.js caching strategy and invalidation. | TBD |
| Error handling | Boundaries, user-facing error states, logging. | TBD |
| Observability | Logging, error tracking, performance monitoring. | TBD |
| Environments | Local / preview / production separation. | TBD |
| Deployment target | Hosting platform and pipeline. | TBD |

## Design principles

- **Mobile-first.** Small screens define layout and interaction; larger viewports adapt upward.
- **Installable by design.** New work should not compromise the ability to deliver an installable PWA.
- **Web parity.** The browser experience must stay usable; installation is an enhancement, not a requirement.
- **One warm surface.** The product is small and personal, so prefer simple, cohesive solutions over flexible platform abstractions.
- **Server-first data access.** Data access and authorization belong on the server unless a specific case justifies otherwise.

## Constraints

- Follow [TECH_STACK.md](TECH_STACK.md); no new framework, database, state manager or styling system without a recorded decision in [DECISIONS.md](DECISIONS.md).
- Respect the Next.js version in this repository: consult the framework documentation shipped with the installed package when APIs or conventions are uncertain, since this version differs from widely known older releases.
- The data model is documented in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and must be updated in the same change as any schema work.
