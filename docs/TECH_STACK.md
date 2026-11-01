# Tech Stack

Confirmed technologies for Mimori. Versions are listed **only** where they were verified in this repository's configuration files; anything else is marked `TBD`.

## Core stack

| Technology | Role | Version (verified) | Source |
| ---------- | ---- | ------------------ | ------ |
| Next.js | Application framework (App Router) | `16.4.3` | `package.json` |
| React | UI library | `19.3.0` | `package.json` |
| React DOM | DOM renderer | `19.3.0` | `package.json` |
| TypeScript | Language | `^5` (range, not pinned) | `package.json` |
| Prisma | ORM | Not installed — no version to report | — |
| PostgreSQL | Database | Not provisioned — no version to report | — |

Prisma and PostgreSQL are **confirmed decisions** (see [DECISIONS.md](DECISIONS.md)), but neither exists in the repository yet: there is no Prisma dependency, no schema file and no database connection. Exact versions will be recorded once they are actually added.

## Supporting tooling (present in the scaffold)

| Tool | Role | Version (verified) |
| ---- | ---- | ------------------ |
| Tailwind CSS | Styling | `^4` |
| `@tailwindcss/turbopack` | Tailwind integration for the Turbopack pipeline | `^4` |
| ESLint | Linting | `^9` |
| `eslint-config-next` | Next.js lint rules | `16.4.3` |
| `@types/node` | Node type definitions | `^20` |
| `@types/react`, `@types/react-dom` | React type definitions | `^19` |

These come from the initial application scaffold. They are in use but are not binding product decisions.

## Design system

| Concern | Implementation | Status |
| ------- | -------------- | ------ |
| Colour tokens | CSS custom properties in `app/globals.css`, exposed to utilities through Tailwind v4 `@theme inline` | Implemented |
| Typography | Roboto (body) and Caveat (decorative) loaded with `next/font/google`, self-hosted at build time — no runtime request to Google | Implemented |
| Theme | `prefers-color-scheme` drives light/dark; no switcher UI | Implemented |
| Status colours | `success`, `warning`, `danger`, `info`, `neutral` token families with foreground/surface/border | Implemented |

No dependency was added for the design system; it uses Tailwind CSS v4 and `next/font`, which were already present. Decisions: [D-007](DECISIONS.md) and [D-008](DECISIONS.md). Contrast limitations: [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Framework notes

- **Next.js 16.4.3 differs from widely known older releases.** Consult the guides shipped with the installed package (`node_modules/next/dist/docs/`) before using framework APIs; training-data familiarity with older Next.js is not reliable here.
- The application uses the **App Router** under `app/`.
- **Tailwind CSS v4** is configured; do not introduce a second styling system.

## Confirmed but not yet integrated

| Technology | Confirmed by | Status |
| ---------- | ------------ | ------ |
| Prisma | Stack decision | Pending integration |
| PostgreSQL | Stack decision | Pending provisioning |

## Undecided (TBD)

| Area | Status |
| ---- | ------ |
| Hosting / deployment platform | TBD |
| Database hosting provider and environment | TBD |
| Authentication provider or approach | TBD |
| PWA tooling (manifest strategy, service worker library or none) | TBD |
| Form, validation and data-fetching libraries | TBD |
| Client state management | TBD |
| Testing frameworks (unit, integration, end-to-end) | TBD |
| Error monitoring and analytics | TBD |
| Media/object storage | TBD |
| CI/CD pipeline | TBD |
| Package manager policy | npm is used by the scaffold; long-term policy `TBD` |
| Node.js version requirement | Only `@types/node` `^20` is declared; runtime version policy `TBD` |

## Rules

- Do not add a dependency, framework, database or service that is not in this document without a recorded decision in [DECISIONS.md](DECISIONS.md).
- Record exact versions here only after verifying them in configuration files — never from memory.
- When Prisma and PostgreSQL are integrated, update this document and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) in the same change.
