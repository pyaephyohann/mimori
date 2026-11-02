# Roadmap

A phased plan for building Mimori. Only the current phase is concrete; later phases deliberately avoid naming features that have not been planned.

## Phase 0 — Foundation (current)

| Item | Status |
| ---- | ------ |
| Repository and application scaffold | Done |
| Initial project-cleanup commit | Done |
| Documentation system (`AGENTS.md`, `knowledge.md`, `docs/`) | Done |
| Architectural, data-model and stack decisions | Partly — see `TBD` items in [ARCHITECTURE.md](ARCHITECTURE.md) and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |

## Phase 1 — Technical foundation

| Item | Status |
| ---- | ------ |
| Prisma integrated with PostgreSQL | Done for local development — Prisma 7.10.1 with a global schema, one applied migration and generated client against a local PostgreSQL 18.6 `mimori` database ([TECH_STACK.md](TECH_STACK.md)); no data-access code yet |
| Initial schema designed and documented | Done — global models, no user ownership ([DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [D-013](DECISIONS.md)) |
| Access model and authentication decided | `TBD` |
| PWA baseline (manifest, icons, installability) | `TBD` |
| Design tokens, typography and theming | Done — see [ARCHITECTURE.md](ARCHITECTURE.md#design-system) |
| Mobile-first layout shell | `TBD` |
| Deployment and environment strategy | `TBD` |

Scope and order within this phase are **TBD**.

## Phase 2 — Core product

**Feature planning: TBD.** This phase covers the first user-facing functionality around keeping and revisiting shared memories. Nothing is committed yet; see [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) for confirmed goals and open questions.

## Phase 3 — Refinement

**TBD.** Placeholder for polish, accessibility, performance and whatever else emerges from actual use.

## Phase 4 — Advanced capabilities

**TBD.** Offline support, notifications, background synchronization and other advanced PWA capabilities are **not confirmed** and are not scheduled. They appear here only as unplanned possibilities.

## Not scheduled

- Anything not listed above.

## Rules

- Do not add roadmap items that have not been agreed; mark them `TBD` instead.
- Track implementation status in [FEATURES.md](FEATURES.md), not here; this document tracks phases and intent.
- Record dated progress in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md).
