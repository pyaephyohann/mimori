# Tech Stack

Confirmed technologies for Mimori. Versions are listed **only** where they were verified in this repository's configuration files; anything else is marked `TBD`.

## Core stack

| Technology | Role | Version (verified) | Source |
| ---------- | ---- | ------------------ | ------ |
| Next.js | Application framework (App Router) | `16.4.3` | `package.json` |
| React | UI library | `19.3.0` | `package.json` |
| React DOM | DOM renderer | `19.3.0` | `package.json` |
| TypeScript | Language | `^5` (range, not pinned) | `package.json` |
| Prisma | ORM | `7.10.1` | `package.json` (pinned; CLI in `devDependencies`, `@prisma/client` in `dependencies`) |
| `@prisma/adapter-pg` | Prisma 7 PostgreSQL driver adapter (brings `pg`) | `7.10.1` | `package.json`; used by `lib/db.ts` |
| PostgreSQL | Database | `18.6` | `select version()` on the local server (`localhost:5432`) |

Prisma is installed and configured: the schema is in `prisma/schema.prisma`, the CLI reads `prisma7.config.ts`, and the client generates to `generated/prisma` (git-ignored).

A local PostgreSQL 18.6 database named `mimori` runs on `localhost:5432`. `prisma7.config.ts` reads `DATABASE_URL` from a git-ignored `.env` and loads it with Node's built-in `process.loadEnvFile`, so no `dotenv` dependency is needed. The connection is verified and the initial migration `20261101193126_init_global_photo_system` is applied. No seed data or production database exists; deployment is `TBD`.

Prisma 7 queries require a driver adapter, so `@prisma/adapter-pg` is installed at the same version as the client. `lib/db.ts` builds one cached `PrismaClient` with `PrismaPg`; the widget Route Handlers are its only callers today.

## Supporting tooling (present in the scaffold)

| Tool | Role | Version (verified) |
| ---- | ---- | ------------------ |
| Tailwind CSS | Styling | `^4` |
| `@tailwindcss/turbopack` | Tailwind integration for the Turbopack pipeline | `^4` |
| ESLint | Linting | `^9` |
| `eslint-config-next` | Next.js lint rules | `16.4.3` |
| `@types/node` | Node type definitions | `^20` |
| `@types/react`, `@types/react-dom` | React type definitions | `^19` |
| framer-motion | Animation of the hero carousel's running border and the widget desktop's drag offset and dialog transitions | `14.9.0` |

These come from the initial application scaffold. They are in use but are not binding product decisions.

## Design system

| Concern | Implementation | Status |
| ------- | -------------- | ------ |
| Colour tokens | CSS custom properties in `app/globals.css`, exposed to utilities through Tailwind v4 `@theme inline` | Implemented |
| Typography | Roboto (body) and Caveat (decorative) loaded with `next/font/google`, self-hosted at build time — no runtime request to Google | Implemented |
| Theme | `prefers-color-scheme` drives light/dark; no switcher UI | Implemented |
| Status colours | `success`, `warning`, `danger`, `info`, `neutral` token families with foreground/surface/border | Implemented |

The design system itself added no dependency: it uses Tailwind CSS v4 and `next/font`, which were already present. `framer-motion` was added later, for the hero carousel's animated running border ([D-019](DECISIONS.md), [D-020](DECISIONS.md)) and reused for the widget desktop's drag and dialog motion ([D-026](DECISIONS.md)); no drag-and-drop library was added. Decisions: [D-007](DECISIONS.md), [D-008](DECISIONS.md) and [D-019](DECISIONS.md). Contrast limitations: [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Framework notes

- **Next.js 16.4.3 differs from widely known older releases.** Consult the guides shipped with the installed package (`node_modules/next/dist/docs/`) before using framework APIs; training-data familiarity with older Next.js is not reliable here.
- The application uses the **App Router** under `app/`.
- **Tailwind CSS v4** is configured; do not introduce a second styling system.

## Chosen but not yet operational

| Technology | Confirmed by | Status |
| ---------- | ------------ | ------ |
| Prisma | Stack decision, [D-003](DECISIONS.md) | Schema, applied migration and generated client; queried by the widget API only |
| Prisma driver adapter (`@prisma/adapter-pg` and a `pg` driver) | Prisma 7 requirement | Installed `7.10.1` and wired through `lib/db.ts` ([D-025](DECISIONS.md)) |
| PostgreSQL | Stack decision, [D-003](DECISIONS.md) | Provisioned locally (`mimori`, 18.6) and migrated; no data |
| Cloudinary | [D-011](DECISIONS.md) | Schema references its assets; no SDK, upload or deletion flow exists |

## Undecided (TBD)

| Area | Status |
| ---- | ------ |
| Hosting / deployment platform | TBD |
| Database hosting provider and environment | TBD |
| Authentication provider or approach | TBD |
| PWA tooling (manifest strategy, service worker library or none) | TBD |
| Form, validation and data-fetching libraries | TBD |
| Client state management | TBD — the widget desktop currently uses a React context plus `fetch` to the Route Handlers |
| Testing frameworks (unit, integration, end-to-end) | TBD |
| Error monitoring and analytics | TBD |
| Cloudinary account, credentials and upload presets | TBD — Cloudinary is the chosen provider, no environment is configured |
| CI/CD pipeline | TBD |
| Package manager policy | npm is used by the scaffold; long-term policy `TBD` |
| Node.js version requirement | Only `@types/node` `^20` is declared; runtime version policy `TBD` |

## Rules

- Do not add a dependency, framework, database or service that is not in this document without a recorded decision in [DECISIONS.md](DECISIONS.md).
- Record exact versions here only after verifying them in configuration files — never from memory.
- When Prisma and PostgreSQL are integrated, update this document and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) in the same change.
