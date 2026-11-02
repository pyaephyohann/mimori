# Known Issues

Defects, limitations and rough edges in Mimori. This document records problems that are actually known — it is not a backlog of wishes.

## Current state

Implemented surfaces are the design-system foundation ([D-007](DECISIONS.md), [D-008](DECISIONS.md)) and the Romantic Scrapbook homepage ([D-014](DECISIONS.md)). The contrast issues below follow from the fixed brand HEX values and were calculated from the shipped tokens on 2026-11-01; the homepage issues were found while building and checking it on 2026-11-02.

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

### ISSUE-006 — Homepage captions and alt text are placeholder copy

- Severity: low
- Area: ui / content
- Status: open
- Affected: `lib/photos.ts` — every photo shares `alt: "A photo of us"`, and captions are short generic phrases (`us, always`, `this day`, …) rather than dates or descriptions.
- Expected: alt text that describes each photo, and captions that mean something to the couple.
- Actual: the photos were supplied without dates or descriptions, so the labels are decorative placeholders written for the layout.
- Workaround: edit the manifest — captions and alt text are not duplicated anywhere else.

### ISSUE-007 — HEIC originals still ship from `public/`

- Severity: low
- Area: assets
- Status: open
- Affected: `public/couple-images/*.HEIC` (7 files, ~12 MB).
- Expected: only browser-decodable assets inside `public/`.
- Actual: the originals were kept alongside their JPEG derivatives ([D-016](DECISIONS.md)); browsers cannot render HEIC, and nothing references the files, so they are dead weight that is still served if requested directly.
- Workaround: leave them, or move them outside `public/` once they are backed up elsewhere.

### ISSUE-008 — The same photo can appear in the hero and the gallery

- Severity: low
- Area: ui
- Status: open
- Affected: `/` — hero carousel and gallery both draw from the same eight photos.
- Expected: two sections that do not obviously repeat the same images.
- Actual: both sections randomise independently, so duplicates across sections are normal; with only eight photos the overlap is easy to notice.
- Workaround: none until there are more photos or the hero gets a separate selection rule.

### ISSUE-009 — The carousel border and its glow share the page's pink family

- Severity: low
- Area: ui
- Status: fixed — the frame now carries a static pure white edge
- Affected: `/` — the running border around the hero carousel container.
- Expected: a frame that separates clearly from the page.
- Actual: the running gradient is built only from the page's own Hot Pink (`#FF69B4`), so on the Hot Pink canvas the border itself did not separate from the page ([D-010](DECISIONS.md)). A static pure white edge (`#FFFFFF`) on the frame now provides that separation, with the running gradient reading against it instead of against the canvas ([D-020](DECISIONS.md)). The soft white halo (`rgba(255, 255, 255, 0.42)`) remains deliberately subtle.
- Workaround: not needed.
- Note: verified in the built stylesheet only; no browser or screenshot verification was performed for this change.

### ISSUE-010 — Two navigation destinations still have nothing behind them

- Severity: medium
- Area: ui
- Status: open — blocked on features that do not exist
- Affected: `components/nav/site-nav.tsx` — Collections and Photo Booth, plus the Add Memory / Add Collection / New Photo Booth labels those pages would show.
- Expected: every navigation destination opens a working page, and each page's primary action starts its creation flow.
- Actual: the project still has one route (`/`) for content ([FEATURES.md](FEATURES.md): PHOTO-1…4 are `PLANNED`). Collections and Photo Booth render as `aria-disabled` entries with a "coming soon" title, and their action button keeps its final pink styling but stays `disabled` with an explanatory title ([D-022](DECISIONS.md)). Nothing pretends to work.
- Update 2026-11-02: the homepage's primary action now works — "+ Add Widgets" opens the widget dialog (WIDGET-1), and Gallery links to `/#gallery`. Only the two unbuilt destinations remain.
- Workaround: none; Home and the gallery anchor are usable today.

### ISSUE-011 — The active navigation label is below WCAG AA contrast

- Severity: low
- Area: ui / accessibility
- Status: open
- Affected: `components/nav/site-nav.tsx` — active destination label and icon.
- Expected: normal-size text meeting 4.5:1.
- Actual: the active label is Deep Candy Pink `#F02E8D` on the Blush Pink `#F9E1EA` pill, which measures **3.10:1**; Rose Pink would be 1.91:1 and Candy Pink 2.46:1. The design calls for rose-pink text on a soft pink pill, and the brand palette is fixed ([D-008](DECISIONS.md)), so no compensating colour was invented ([D-022](DECISIONS.md)). Inactive labels are Warm Charcoal at 75% on paper (≈6.5:1) and the Add Memory button keeps white on Candy Pink (3.04:1, ISSUE-003).
- Workaround: choose a deeper text colour or a paler pill — both require an approved colour decision.

### ISSUE-012 — Widgets cannot use an uploaded photo

- Severity: medium
- Area: ui / media
- Status: open — blocked on the upload pipeline
- Affected: the Add Widgets dialog's photo-source step (`components/widgets/add-widget-dialog.tsx`), and the Add Memory action on non-home pages.
- Expected: a new photo can be uploaded from the device and used by a widget, without duplicating an existing upload.
- Actual: no upload pipeline exists — no Cloudinary SDK, upload preset, API route or file validation ([FEATURES.md](FEATURES.md): MEDIA-1 and WIDGET-2 are `PLANNED`). The dialog therefore offers only "From the gallery" and shows the upload option as a disabled "soon" chip, rather than inventing a client-side upload that would bypass the storage rules ([D-025](DECISIONS.md)).
- Workaround: none. Existing gallery photos (the local manifest) can be chosen, and a widget can be edited later to change them.

### ISSUE-013 — The widget layout is one absolute arrangement for every screen

- Severity: low
- Area: ui / responsive
- Status: open — accepted for now
- Affected: `components/widgets/widget-canvas.tsx` on viewports narrower than the layout was arranged on.
- Expected: widgets stay reachable and legible on phones and tablets.
- Actual: positions are stored once in absolute pixels ([D-026](DECISIONS.md)). On a narrow screen every card is clamped inside the canvas with CSS `min()` and its height follows `aspect-ratio`, so nothing leaves the canvas or overflows the page, but cards arranged side by side on desktop are pulled together and can sit closer than the 12px gap used for placement. The stored arrangement is not rewritten by a visit.
- Workaround: arrange on the device you use most, or use the size control in the widget's options handle to make a card smaller. A per-breakpoint layout would need a new decision and extra storage.

### ISSUE-014 — A touch that starts on a widget moves it instead of scrolling

- Severity: low
- Area: ui / mobile
- Status: open — accepted
- Affected: `components/widgets/widget-canvas.tsx` on touch screens.
- Expected: the page scrolls normally, and widgets can still be repositioned by touch.
- Actual: because every widget is draggable at all times ([D-026](DECISIONS.md)) and framer-motion's drag needs `touch-action: none` to receive the gesture, a swipe that begins on a widget repositions it rather than scrolling the page. A drag that lands on another piece is pushed to the nearest free slot, so a stray touch cannot hide a widget, and a failed save restores the previous position. Scrolling still works everywhere else on the page, and each widget's options handle is a tap target that never starts a drag.
- Workaround: start a scroll beside a widget rather than on it. A long-press-to-drag threshold would remove the surprise, but it also makes a desktop-style drag feel less immediate.

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
