# Known Issues

Defects, limitations and rough edges in Mimori. This document records problems that are actually known — it is not a backlog of wishes.

## Current state

**No application features exist yet**, so there are no feature defects. The design-system foundation ([D-007](DECISIONS.md), [D-008](DECISIONS.md)) is the only implemented surface, and the issues below are measured contrast limits that follow from its fixed brand HEX values. They were calculated from the shipped tokens on 2026-11-01.

Any issue documented below must have been actually observed. Do not speculate.

## Open issues

### ISSUE-001 — Muted text is unreadable on the brand background

- Severity: medium
- Area: design tokens / accessibility
- Status: open
- Affected pairing: `--muted-foreground` (`#6E5862`) on `--background` (`#FF69B4`) = **2.45:1**; dark-theme muted (`#C9B3BC`) on the same background = **1.34:1** (WCAG AA for body text requires 4.5:1)
- Expected: muted secondary text readable wherever it is used.
- Actual: the Hot Pink canvas ([D-010](DECISIONS.md)) is too light for a muted tone in either theme; the same token on light `--surface` measures 6.20:1 and on dark `--surface` 8.07:1, both fine.
- Workaround: keep muted text inside surfaces. No foreground token currently reads well on the Hot Pink canvas (see ISSUE-004 and ISSUE-005).
- Possible fix (needs approval, because it changes the visual identity): introduce a background-specific text token tuned for Hot Pink, or restore a theme-specific canvas. Either change is a product decision, not a token tweak.

### ISSUE-002 — White button text on Candy Pink is below AA for normal text

- Severity: low
- Area: buttons / accessibility
- Status: open
- Affected pairings: `#FFFFFF` on `--primary` (`#FF4FA3`) = **3.04:1**; `#FFFFFF` on `--primary-hover` (`#F02E8D`) = **3.83:1**
- Expected: button labels readable at their rendered size.
- Actual: both pass AA for large text and non-text UI (3:1), but **normal-sized white button labels do not meet WCAG AA** (1.4.3 requires 4.5:1). At the default 16px body size the label is below the threshold.
- Workaround: render primary button labels at large-text sizes (≥24px, or ≥18.66px bold), which meets AA-large.
- Status note: the background and the white label are both fixed by [D-009](DECISIONS.md). This limitation is accepted, not scheduled for a colour change — do not alter the button or label colour to "fix" it without a new decision.

### ISSUE-003 — Dusty Rose is a large-text / accent colour only

- Severity: low
- Area: design tokens / accessibility
- Status: open
- Affected pairings: Dusty Rose `#C77B91` on Soft White = **3.01:1**; Warm Charcoal `#49343D` on Dusty Rose = **3.62:1**
- Expected: accent text meets AA where it carries information.
- Actual: both pass AA-large only.
- Workaround: use Dusty Rose for large text, icons, borders and decorative accents, not for body copy.
- Update 2026-11-01: on the Hot Pink background Dusty Rose measures **1.19:1** — never use it as text there.

### ISSUE-004 — Dark-theme text is unreadable on the shared Hot Pink background

- Severity: high
- Area: design tokens / accessibility
- Status: open
- Affected pairings on `--background` (`#FF69B4`) in dark theme: `--foreground` (`#F7EDF1`) = **2.31:1**; `--heading` (`#FFF8FA`) = **2.53:1**; `--muted-foreground` (`#C9B3BC`) = **1.34:1**; status text colours 1.44:1–1.85:1
- Expected: body and heading text readable on the page background in every theme.
- Actual: since [D-010](DECISIONS.md) made the background Hot Pink in both themes, the dark theme's near-white text tokens now sit on a light canvas. Before the change the same tokens measured **16.02:1** against `#1B1216`.
- Impact: any text rendered directly on the canvas in dark mode is hard to read — this is the most significant consequence of the background change.
- Workaround: none at token level. Content placed on `--surface` (`#2A1F24`) remains readable (8.07:1+).
- Possible fix (needs approval, because it changes colours): add a background-specific text token (for example `--on-background`) that is charcoal in both themes, or let the dark theme keep a dark canvas. No compensating change has been made yet.

### ISSUE-005 — Light-theme body text now sits just below AA on the background

- Severity: low
- Area: design tokens / accessibility
- Status: open
- Affected pairings on `--background` (`#FF69B4`) in light theme: `--foreground` and `--heading` (`#49343D`) = **4.31:1** (AA normal text needs 4.5:1); status text colours 2.44:1–3.27:1; white `#FFFFFF` = 2.65:1
- Expected: body text meets AA on the canvas.
- Actual: previously 4.83:1 against `#E88EAD`; the lighter Hot Pink reduces it to 4.31:1 — AA-large only. Status colours used as text directly on the canvas (rather than on their `-surface` tokens) fall well below AA.
- Workaround: render body copy inside `--surface` (10.89:1); use status text only on its matching `-surface` background, where every pair is ≥ 5.66:1.
- Possible fix (needs approval): darken the light-theme text tokens slightly, which changes the brand's text colour and therefore needs a decision.

## Template for a new issue

```text
### ISSUE-### — Title

- Severity: critical | high | medium | low
- Area: ui | data | auth | pwa | performance | build | other
- Status: open | investigating | workaround available | fixed
- Environment: (device, browser, runtime)
- Steps to reproduce:
  1.
  2.
- Expected:
- Actual:
- Notes / workaround:
- Related: FEATURES id or DECISIONS id, if any
```

## Severity guide

| Severity | Meaning |
| -------- | ------- |
| critical | Data loss, security exposure, or the app is unusable. |
| high | A core flow is broken; no reasonable workaround. |
| medium | A noticeable problem with a workaround. |
| low | Cosmetic or minor inconvenience. |

## Process

- Log an issue when it is found, with reproduction steps.
- When fixed, do not delete it: mark it fixed, note the fix and the date.
- Record the completed fix in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md).
- If an issue blocks planned work, mark the affected feature `BLOCKED` in [FEATURES.md](FEATURES.md).
