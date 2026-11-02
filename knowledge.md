# Mimori — Project Knowledge

Concise context for AI agents starting work in this repository. Detailed information lives in [`docs/`](docs/README.md); follow the links instead of expecting it here.

## Identity

**Mimori** is a cozy place to keep our date memories, anniversaries, silly moments and every little piece of our love story.

- Application type: **PWA-first web application**.
- Audience: a couple keeping a shared record of their relationship — private, personal, warm in tone.

## Confirmed stack

| Layer    | Choice                        | State in repository                     |
| -------- | ----------------------------- | --------------------------------------- |
| Framework| Next.js 16.4.3 (App Router)   | Scaffolded                              |
| Language | TypeScript                    | Configured                              |
| Styling  | Tailwind CSS v4               | Configured, with Mimori design tokens   |
| Fonts    | Roboto body, Caveat decorative| Configured through `next/font`          |
| ORM      | Prisma 7.10.1                 | Schema + migration + generated client   |
| Database | PostgreSQL 18.6               | Local `mimori` via `.env`; migrated    |
| Media    | Cloudinary (references only)  | Chosen; no upload or delete flow        |

See [docs/TECH_STACK.md](docs/TECH_STACK.md) for verified versions and what is still undecided.

## Direction

- PWA-first: the installable experience is the primary target, not an afterthought.
- Mobile-first design with responsive desktop support.
- App-like feel on compatible devices, while the plain browser experience stays functional.
- Offline support, push notifications and background sync are **not** confirmed features. Do not describe them as existing.

## Documentation index

| Document | Use it for |
| -------- | ---------- |
| [docs/README.md](docs/README.md) | Index and reading order |
| [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Identity, vision, direction |
| [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) | Confirmed requirements and TBDs |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System structure (mostly pending) |
| [TECH_STACK.md](docs/TECH_STACK.md) | Verified versions, undecided infrastructure |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Models, relationships, indexes, deletion rules |
| [FEATURES.md](docs/FEATURES.md) | Feature status registry |
| [ROADMAP.md](docs/ROADMAP.md) | Phased plan (mostly TBD) |
| [DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md) | Chronological record of completed work |
| [DECISIONS.md](docs/DECISIONS.md) | Accepted technical/product decisions |
| [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Known bugs and limitations |
| [SECURITY.md](docs/SECURITY.md) | Security principles and requirements |
| [AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) | Required development lifecycle |

## Current status

- The repository contains one initial project-cleanup commit, a Next.js/TypeScript scaffold, a design-system foundation, and a Prisma data model.
- **The user-facing surface is the Romantic Scrapbook homepage** (`/`): a polaroid hero carousel, the widget desktop, a scrapbook photo gallery and an "Our Love Story" band ([FEATURES.md](docs/FEATURES.md), [D-014](docs/DECISIONS.md)). It reads a local photo manifest ([lib/photos.ts](lib/photos.ts)), not the database ([D-015](docs/DECISIONS.md)); the `.HEIC` originals have JPEG derivatives for the web ([D-016](docs/DECISIONS.md)). Hero and gallery orders randomise independently per visit ([D-017](docs/DECISIONS.md)).
- A Prisma schema exists for photos, folders, widgets and Photo Booth ([docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)): four global models, **no user ownership** ([D-013](docs/DECISIONS.md)). A local PostgreSQL 18.6 database `mimori` is connected through a git-ignored `.env` and has the initial migration applied. There is still no authentication, folder or Photo Booth UI, and no PWA configuration.
- The homepage also has a **customizable widget desktop**: eight widget styles, an Add Widgets dialog with gallery photo selection, and a drag/snap canvas with size presets, layer order, edit and remove ([D-025](docs/DECISIONS.md), [D-026](docs/DECISIONS.md)). It sits between the hero and the gallery with no panel, heading or Arrange mode: every piece drags at any time and carries its own options handle, and the navbar's **+ Add Widgets** is the only way to create one. Its arrangement is the only database-backed data, stored in the existing `Widget.config` JSON — so **no migration was needed**, and `WidgetPhoto` stays unused until photos live in `Photo`. Photos still come from the manifest, and uploading a new one is unavailable ([ISSUE-012](docs/KNOWN_ISSUES.md)).
- Prisma 7 queries run through `@prisma/adapter-pg`; `lib/db.ts` exposes one cached `PrismaClient`, used by the `/api/widgets` Route Handlers. Images are referenced from Cloudinary by URL and public id, never stored in PostgreSQL ([D-011](docs/DECISIONS.md)).
- Tests: `node --test lib/randomize.test.ts lib/widgets/*.test.ts` covers the ordering rules, widget validation and canvas geometry with no extra dependency. `npx tsc --noEmit`, `npm run lint` and `npm run build` are the standard checks.
- Design tokens (brand palette, semantic light/dark roles, status colours, fonts) live in `app/globals.css`; usage rules and contrast limits are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#design-system) and [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).
- The page background is Hot Pink `#FF69B4` in **both** themes ([D-010](docs/DECISIONS.md)); dark-theme text tokens are tuned for dark surfaces, so text placed directly on the canvas has known contrast limits — check [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) before putting copy on the background.
- Completed milestones are recorded in [DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md).

## Development rules

1. Read [AGENTS.md](AGENTS.md) — the binding instructions — before any work.
2. Inspect existing code before implementing; never assume a file or dependency exists.
3. Stay inside the requested scope; no unrequested features, dependencies or refactors.
4. Never claim something is implemented unless it is built and verified. Use `TBD` for undecided items.
5. Update the documentation in the same task as verified work.
6. Never commit or push without explicit authorization.
7. Never read, print or commit secrets from `.env` files.
