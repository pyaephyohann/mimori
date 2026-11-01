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
| ORM      | Prisma                        | Confirmed decision, not yet integrated  |
| Database | PostgreSQL                    | Confirmed decision, not yet provisioned |

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
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Data model (pending) |
| [FEATURES.md](docs/FEATURES.md) | Feature status registry |
| [ROADMAP.md](docs/ROADMAP.md) | Phased plan (mostly TBD) |
| [DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md) | Chronological record of completed work |
| [DECISIONS.md](docs/DECISIONS.md) | Accepted technical/product decisions |
| [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Known bugs and limitations |
| [SECURITY.md](docs/SECURITY.md) | Security principles and requirements |
| [AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) | Required development lifecycle |

## Current status

- The repository contains one initial project-cleanup commit, a Next.js/TypeScript scaffold, and a design-system foundation.
- **No application features are implemented.** No Prisma schema, database connection, authentication, API routes or PWA configuration exists yet.
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
