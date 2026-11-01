# Decisions

Accepted technical and product decisions for Mimori, with the reasoning behind them. A decision here is binding until it is superseded by a later entry.

## Status values

- **Accepted** — in effect.
- **Superseded** — replaced by a newer decision.
- **Proposed** — suggested, not yet agreed. Not binding.

---

## D-001 — Project name: Mimori

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** The project is named **Mimori**.
- **Context:** The product needed a stable identity before documentation, repository metadata and design work.
- **Consequences:** Package name, page metadata and all documentation use "Mimori". The name is used consistently for the application, its documentation and its user-facing identity.

---

## D-002 — Framework and language: Next.js with TypeScript

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** Mimori is built with **Next.js** and **TypeScript**.
- **Context:** A single framework that supports both server-rendered pages and an installable PWA delivery model, with static typing for a long-lived personal project.
- **Consequences:** All application code is TypeScript. Framework conventions and the version installed in the repository take precedence over general Next.js knowledge. Adding another framework or a plain-JavaScript area requires a new decision.

---

## D-003 — Data layer: Prisma with PostgreSQL

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** Persistence uses **Prisma** as the ORM over **PostgreSQL**.
- **Context:** A relational store suits the structured, related nature of memories, dates and anniversaries; Prisma provides a typed schema and a migration workflow.
- **Consequences:** The data model lives in a Prisma schema and is documented in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md). Both are confirmed choices but are **not yet integrated** — see [TECH_STACK.md](TECH_STACK.md). No alternative database or ORM may be introduced without a new decision.

---

## D-004 — Application type: PWA-first web application

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** Mimori is a **PWA-first web application**. The installable, app-like experience is the primary target rather than a later enhancement.
- **Context:** The product should be kept on a home screen and opened like an app, while still being delivered over the web.
- **Consequences:** Installability is treated as a first-class requirement ([R-1](PRODUCT_REQUIREMENTS.md)). New work must not compromise it. The application must still work as an ordinary website ([R-3](PRODUCT_REQUIREMENTS.md)). Advanced PWA capabilities — offline support, push notifications, background sync — are **not** implied by this decision and remain unconfirmed.

---

## D-005 — Design direction: mobile-first, responsive

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** Design is **mobile-first**, with responsive support for tablet and desktop.
- **Context:** A personal, frequently-opened keepsake is mostly used on a phone; the app-like experience is strongest on small touch screens.
- **Consequences:** Layouts, interaction and performance are designed for small screens first and adapted upward. Desktop is fully supported but is not the baseline that drives layout decisions.

---

## D-006 — Documentation system in `docs/`

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** The project maintains a documentation system at the repository root (`AGENTS.md`, `knowledge.md`) and in `docs/`, updated as part of the work that changes what it describes.
- **Context:** Both humans and AI agents work on Mimori; a shared, accurate record of intent, status and constraints prevents drift and duplicated effort.
- **Consequences:** Documents are part of the definition of done. Any change that alters architecture, schema, features or scope updates the relevant document in the same task. Documentation must describe reality — undecided items are marked `TBD`.

---

## D-007 — Typography: Roboto body, Caveat decorative

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** **Roboto** is the application's default font. **Caveat** is the decorative script font, used only for romantic headings, handwritten-style labels and similar short accents.
- **Context:** The product needs a neutral, highly legible body face plus one expressive face that carries the cozy tone without hurting readability.
- **Consequences:** Both fonts are self-hosted through `next/font/google` in the root layout and exposed as tokens (`--font-body`, `--font-script`) plus the Tailwind utilities `font-sans` and `font-decorative`. Caveat is opt-in only — never for paragraphs, forms or long copy. Changing either font means updating the two `next/font` calls in `app/layout.tsx` and the two token mappings in `app/globals.css`; no new dependency is involved.

---

## D-008 — Colour system: fixed brand palette, semantic roles, native theme

- **Status:** Accepted — its page-background choice is superseded by [D-010](#d-010--page-background-hot-pink-in-both-themes); everything else stands.
- **Date:** 2026-11-01
- **Decision:** The eight brand colours are fixed `--brand-*` tokens whose HEX values are identical in every theme. Components consume only semantic role tokens (`--background`, `--surface`, `--surface-muted`, `--border`, `--heading`, `--foreground`, `--muted-foreground`, `--primary*`, `--accent*`, `--ring`), which are re-mapped per theme. Five status families (`success`, `warning`, `danger`, `info`, `neutral`) each carry a foreground, surface and border token and are kept separate from the brand palette. Theme follows the operating system via `prefers-color-scheme`; no theme-switching interface exists.
- **Context:** A single source of truth prevents per-component colour logic, keeps the supplied brand values exact, and lets the app respond to light/dark preference on day one.
- **Consequences:** New colours are added as tokens in `app/globals.css`, never hardcoded in components. A manual switcher can later override the same semantic variables (for example `[data-theme="dark"]`) without touching component code. Contrast limits that follow from the fixed brand values are recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

---

## D-009 — Primary buttons keep white text on Candy Pink

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** Primary buttons use **Candy Pink `#FF4FA3`** as the background, **Deep Candy Pink `#F02E8D`** on hover, and **white `#FFFFFF`** for the label. All three values are fixed; the white label is a deliberate choice and not an oversight.
- **Context:** The design-system audit measured white on Candy Pink at **3.04:1** and white on Deep Candy Pink at **3.83:1** — below WCAG AA (1.4.3) for normal-size text. The palette was reviewed and the brand look was chosen over altering either the button background or the label colour.
- **Consequences:** `--primary`, `--primary-hover`, `--primary-foreground` and the `--brand-candy-pink` / `--brand-deep-candy-pink` / `--brand-white` values must not be changed to improve contrast without a new decision superseding this one. Normal-size white labels do **not** meet WCAG AA (4.5:1); AA-large (≥18.66px bold or ≥24px) is met, so primary button labels should be rendered at large-text sizes wherever the layout allows. Tracked as [ISSUE-002](KNOWN_ISSUES.md).

---

## D-010 — Page background: Hot Pink in both themes

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decision:** The page background is **Hot Pink `#FF69B4`** in **both** the light and dark themes, through the `--brand-hot-pink` token referenced by `--background`. This supersedes the page-background part of [D-008](#d-008--colour-system-fixed-brand-palette-semantic-roles-native-theme), which used Rose Pink in light and `#1B1216` in dark.
- **Context:** Approved product change: the app should sit on one hot pink canvas regardless of theme, rather than a pink light surface and a near-black dark surface.
- **Consequences:** All other brand values, the primary button (D-009), Soft White and dark surfaces, typography and the status palettes are unchanged; `--brand-rose-pink` `#E88EAD` remains a palette value but is no longer the page background. Because the canvas is now a light, saturated pink in both themes, text tokens tuned for the old canvases fall below WCAG AA on it: light body text **4.31:1** (was 4.83:1) and light muted **2.45:1**, while dark-theme near-white text drops to **2.31:1** (was 16.02:1) with heading 2.53:1 and muted 1.34:1. **No compensating colour change was made** — re-tuning any text token requires a new decision. Tracked as [ISSUE-001](KNOWN_ISSUES.md), [ISSUE-004](KNOWN_ISSUES.md) and [ISSUE-005](KNOWN_ISSUES.md).

---

## Adding a decision

Record a decision when a choice constrains future work: framework or library adoptions, data-model structure, authentication approach, PWA behaviour, hosting, or a product-scope change. Use the next free `D-` number and include status, date, decision, context and consequences.
