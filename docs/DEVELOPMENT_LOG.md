# Development Log

A chronological record of completed work. Newest entries are added at the bottom. Only work that was actually finished — and verified where verification was possible — belongs here.

## Entry format

```text
## YYYY-MM-DD — Title
- Type: documentation | feature | fix | refactor | infrastructure
- Changes: what was done
- Verification: how it was checked
- Notes: decisions, follow-ups, limitations
```

---

## 2026-11-01 — Initial documentation system

- **Type:** documentation
- **Changes:** Created the project's foundational documentation set: `AGENTS.md` (permanent agent instructions), `knowledge.md` (concise onboarding context) and thirteen documents under `docs/` covering overview, requirements, architecture, stack, schema, features, roadmap, decisions, known issues, security and agent workflow. Replaced the placeholder `AGENTS.md` with the project instruction set while preserving the framework-managed block it already contained.
- **Verification:** Confirmed every expected file exists, cross-references between documents resolve, and no application source code or configuration was modified.
- **Notes:** Created before any application code. Documents describing unbuilt areas are explicitly marked as pending. No application features exist, so nothing is recorded as implemented.

## 2026-11-01 — Design system foundation

- **Type:** infrastructure / design system
- **Changes:** Replaced the scaffold defaults with Mimori's design foundation. Roboto (body) and Caveat (decorative) are loaded through `next/font/google` in `app/layout.tsx` and self-hosted; the Geist fonts were removed. `app/globals.css` now defines the eight fixed brand colours, semantic light/dark roles, five status families and the font tokens, mapped into Tailwind with `@theme inline`. Body and heading colours follow the semantic tokens; a `font-decorative` utility and a low-specificity focus ring were added.
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean. `npm run build` succeeded on Next.js 16.4.3 (static `/` and `/_not-found`). Compiled CSS (`.next/static/chunks/0p_qe58k7f6a3.css`) contains every brand HEX exactly once, all semantic and status variables, the body font token, the dark-theme override and `font-decorative`; 13 woff2 files were emitted to `.next/static/media`. Contrast was computed for 27 pairings — all status pairs are ≥ 5.66:1 in light and ≥ 8.32:1 in dark. Three limits of the fixed palette are logged as [ISSUE-001 to ISSUE-003](KNOWN_ISSUES.md). No browser render check was performed.
- **Notes:** No dependency added. Theme follows `prefers-color-scheme`; no switcher UI. [FEATURES.md](FEATURES.md) is unchanged because no user-facing feature shipped.

## 2026-11-01 — Page background changed to Hot Pink in both themes

- **Type:** design tokens
- **Changes:** Added `--brand-hot-pink: #FF69B4` and pointed `--background` at it in both themes, replacing the light Rose Pink canvas and the dark `#1B1216` canvas. No other token changed: primary, hover, button text, surfaces, borders, status families and fonts are untouched.
- **Verification:** `npm run lint`, `npx tsc --noEmit` and `npm run build` all pass. In the running app, `getComputedStyle(document.body).backgroundColor` returns `rgb(255, 105, 180)` under both emulated light and dark schemes, while `--primary` stays `#ff4fa3`, `--primary-foreground` `#fff` and `--surface` `#fff8fa` / `#2a1f24`.
- **Notes:** Contrast was recalculated against the new canvas: light body 4.31:1, light muted 2.45:1, dark body 2.31:1, dark heading 2.53:1, dark muted 1.34:1. These regressions are logged as [ISSUE-001](KNOWN_ISSUES.md), [ISSUE-004](KNOWN_ISSUES.md) and [ISSUE-005](KNOWN_ISSUES.md); no compensating colour change was made, as it would need a decision. Recorded as [D-010](DECISIONS.md), which supersedes the background part of D-008.

## Prior history

The repository contains one earlier commit — the initial project cleanup that initialized the application scaffold. It predates this log and is recorded here only for context; no hash, dates or activities are claimed for it.
