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
- **Consequences:** The data model lives in a Prisma schema and is documented in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md). Prisma is now integrated — schema, migration and generated client — while PostgreSQL is still **not provisioned** (see [TECH_STACK.md](TECH_STACK.md) and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)). No alternative database or ORM may be introduced without a new decision.

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

## D-011 — Media storage: Cloudinary, references only in PostgreSQL

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** Images are stored and served by **Cloudinary**. PostgreSQL stores only the Cloudinary `secureUrl`, the `publicId` and image metadata (`fileName`, `width`, `height`, `mimeType`, `fileSize`, `takenAt`). No image bytes, binary columns, Base64 content or local file paths are ever written to the database.
- **Context:** Photos are the core content of the product, and a relational database is the wrong place for image payloads — it bloats backups, bypasses image transformation and CDN delivery, and makes the app slow to read.
- **Consequences:** `Photo.publicId` is unique and is the handle for transforms and deletion. Deleting a `Photo` row does **not** delete the Cloudinary asset; the media layer must delete the asset in the same operation. The upload, transform and deletion flows are not implemented yet — only the schema exists. Cloudinary is used through the server only; credentials must never reach the client ([SECURITY.md](SECURITY.md)).

---

## D-012 — Photo management data model

- **Status:** Accepted — its ownership part is superseded by [D-013](#d-013--global-data-model-no-user-ownership); the rest stands.
- **Date:** 2026-11-02
- **Decision:** Photos live in **one** central `Photo` table, distinguished by a `PhotoKind` enum (`GALLERY` | `PHOTO_BOOTH`). Folders group photos (`Photo.folderId` nullable, `ON DELETE SET NULL`). Widgets select photos through an ordered join table `WidgetPhoto` with a `position`, and keep widget-specific settings in a `Json` `config` column.
- **Context:** Photo Booth is a separate product section but not a separate kind of image, so duplicating storage would double the upload, deletion and metadata code. Widgets need both a chosen set of photos and an order, which a many-to-many column or JSON array cannot express safely.
- **Consequences:** Gallery and Photo Booth are filtered views over the same model (`kind`), and both are index-backed. Deleting a folder keeps its photos and un-files them; deleting a photo drops its widget links. `Widget.type` is a free-form string and `config` a JSON object so new widget kinds need no migration — both must be validated in the application. The original `User` owner and `userId` columns were removed by [D-013](#d-013--global-data-model-no-user-ownership). Full detail in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

---

## D-013 — Global data model: no user ownership

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** Mimori's database is **global**. There is no `User` model, no `userId` column and no per-user ownership or authorization relationship. `Folder`, `Photo`, `Widget` and `WidgetPhoto` belong to the single shared Mimori collection. `Folder.name` is **globally unique**. No authentication or authorization model is introduced.
- **Context:** Mimori is a private keepsake for one couple, not a multi-tenant product. A `User` row would have existed only to hold an id nothing yet authenticated against, while forcing every query to carry a `userId` filter that no code enforced. Recreating the database before the first migration made the simplification cheap.
- **Consequences:** Queries drop the ownership scope entirely; there is no "cross-user access" class of bug because there is no second user. Anyone who can reach the deployed app sees the whole collection, so deployment must not expose it publicly without a new access-control decision. Folder names can no longer repeat, so "Trips" and "Trips" are rejected by `Folder_name_key`. Re-introducing multi-user support later is a schema migration plus an authorization layer, not a configuration change. The database was deliberately dropped and recreated empty before this model was written; no data was lost because none existed.

---

## D-014 — Homepage direction: Romantic Scrapbook

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The `/` homepage is a **Romantic Scrapbook**: polaroid-style frames with soft paper surfaces, subtle rotations, handwritten Caveat captions, small 🎀 bow stickers, hand-drawn hearts/arrows/spirals and light floating decoration. Sections run hero carousel → gallery → "Our Love Story" title band. Photos stay the focus; all decoration is `aria-hidden` and motion stops under `prefers-reduced-motion`. The visual reference is `images-reference/cute-scratch-book.png`.
- **Context:** An approved design reference established the aesthetic. The page previously rendered a placeholder `<div>Home</div>`.
- **Consequences:** The Hot Pink canvas ([D-010](#d-010--page-background-hot-pink-in-both-themes)) is unchanged. Text placed directly on that canvas uses the fixed `--brand-warm-charcoal` token in **both** themes, because `--heading` turns near-white in dark mode and is unreadable on Hot Pink ([ISSUE-004](KNOWN_ISSUES.md)). Polaroid frames are built on `--surface`, so captions sit on a readable surface in each theme. No UI framework or dependency was added; `app/globals.css` gained only four scrapbook primitives (tilt, hover lift, two float animations) plus their reduced-motion overrides.

---

## D-015 — Homepage photo source: local manifest, not the database

- **Status:** Accepted — temporary; superseded when the gallery and Cloudinary flows land.
- **Date:** 2026-11-02
- **Decision:** The homepage reads its photos from `lib/photos.ts`, a typed manifest of JPEG files in `public/couple-images`. Neither Prisma nor Cloudinary is involved yet.
- **Context:** No data-access layer or query exists, `@prisma/adapter-pg` is not installed, and no Cloudinary assets exist ([D-011](#d-011--media-storage-cloudinary-references-only-in-postgresql)). The user supplied real photos to display now, and fabricating images was explicitly ruled out.
- **Consequences:** Adding or removing a photo means adding the file and a manifest entry — the two can drift, and nothing validates that a path exists at runtime. Captions and alt text live only in that manifest, which is the single place to edit them. `Photo`/Cloudinary remain the eventual sources (`PHOTO-1`, `MEDIA-1` in [FEATURES.md](FEATURES.md)).

---

## D-016 — HEIC originals get JPEG derivatives

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** Every `.HEIC` photo in `public/couple-images` has a JPEG sibling (longest edge 1600px, quality 82) generated with macOS `sips`. The UI references the JPEGs only; the `.HEIC` originals are kept and left untouched.
- **Context:** Seven of the eight supplied photos were `.HEIC`, which browsers cannot decode, so they would render as broken images.
- **Consequences:** The derivatives are the web assets and are what `next/image` optimizes. The originals remain in `public/` and are still served statically if requested, adding roughly 12 MB of unusable payload to the folder — tracked as [ISSUE-007](KNOWN_ISSUES.md). Any future iPhone import needs the same conversion step until the upload pipeline handles it.

---

## D-017 — Visit randomization contract for hero and gallery

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The hero carousel and the gallery each shuffle on every visit, **independently**. The previous visit's order is stored in `localStorage` under `mimori:hero-order` and `mimori:gallery-order`. A new order never repeats the previous arrangement, and with three or more photos never opens on the previous first photo. Shuffling runs once per mount, after hydration, so server and client markup match and re-renders never reshuffle.
- **Context:** The approved brief asked for per-visit randomization that must not fight React, must survive photo additions/removals, and must not repeat the previous visit's sequence.
- **Consequences:** The rules are pure functions in `lib/randomize.ts`, covered by `lib/randomize.test.ts` on Node's built-in test runner, so no test dependency was added. A single photo keeps its only arrangement; storage failure (private mode) degrades to a plain random order. Because both sections draw from the same eight photos ([D-015](#d-015--homepage-photo-source-local-manifest-not-the-database)), the same photo can appear in both — tracked as [ISSUE-008](KNOWN_ISSUES.md).

---

## D-018 — Polaroid paper stays white in both themes

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** Scrapbook cards use a dedicated `--paper` surface, `--paper-foreground` text and `--paper-edge` border that are **the same in light and dark themes**: Soft White `#FFF8FA` paper, Warm Charcoal `#49343D` captions, Blush Pink `#F9E1EA` image placeholder. Polaroids and the empty-state cards use `bg-paper`, `text-paper-foreground` and `ring-paper-edge` instead of `--surface`.
- **Context:** The frames were built on `--surface`, which is Soft White in light mode but `#2A1F24` in dark mode, so the polaroids turned black and no longer matched the approved white-paper reference.
- **Consequences:** Photos sit on white paper regardless of theme, as in the reference. Captions keep a **10.89:1** contrast because the text token moved with the card rather than following `--foreground`. The tokens are theme-independent, so they are defined once in `:root` and not overridden in the dark block; `--surface` remains the themed surface for future neutral panels. This supersedes the "polaroid frames are built on `--surface`" consequence of [D-014](#d-014--homepage-direction-romantic-scrapbook) only.

---

## D-019 — framer-motion and the hero running border

- **Status:** Accepted — its placement and gradient are superseded by [D-020](#d-020--the-running-border-wraps-the-hero-carousel-container); the dependency and the rotation technique stand.
- **Date:** 2026-11-02
- **Decision:** `framer-motion` `14.9.0` is the project's **only** animation library, added for one feature: an animated running border on the hero. The border is built from two layers masked to their own padding band — a 3px core ring and a wide, dim band — each containing one oversized conic-gradient layer rotating a single infinite revolution every 6 seconds, plus a soft pink `box-shadow` bloom outside the framed element. Under `prefers-reduced-motion` the rotation stops and the rings remain as a static border.
- **Context:** The brief asked for a soft stream of pink light travelling around the hero, following the container's rounded shape rather than reading as a separate rectangle. No animation library was installed and no other was permitted.
- **Consequences:** Animation runs as a transform on two composited layers, so it never re-renders React and framer-motion stops it on unmount. `mask-composite` is what makes the effect read as a border; without it the rings are dropped by an `@supports` guard rather than painting over the photos. The rings sit inside the frame with `pointer-events: none`, so carousel navigation and image interaction are unaffected.

---

## D-020 — The running border wraps the hero carousel container

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The animated running border surrounds the **whole hero carousel container**, not individual photos or polaroid frames. The container is a single rounded frame — `max-w-5xl`, `--carousel-radius` `28px`, `overflow-hidden`, a **static pure white edge** (`border-[var(--brand-white)]`, 2px on mobile and 3px from `sm` up), `p-3` on mobile and `p-5` from `sm` up, and a soft white halo through `--carousel-glow` — with both rings inset `0` inside it, just within the white edge. The running gradient is built **only from the page's own Hot Pink** (`--run-pink: var(--brand-hot-pink)`, `#FF69B4`): the stops are that colour and tints of it mixed toward white with `color-mix()`, ordered so the first and last stops match and the loop has no visible seam. The rotation is slow (one revolution every 9 seconds) so it drifts rather than spins. Polaroid frames keep their existing design and carry no border, animation or glow of their own.
- **Context:** The first implementation lit only the active polaroid, so the border read as an effect on a photo rather than on the carousel. The corrected requirement is one continuous border around the carousel's outer container.
- **Consequences:** The gradient lives in `app/globals.css` beside the other tokens and the rings read it from there, so `RunningBorder` takes no styling props. No new pink enters the project: every stop derives from `--brand-hot-pink`, and the palette in [D-008](#d-008--colour-system-fixed-brand-palette-semantic-roles-native-theme) is untouched. Where `color-mix()` is unavailable the gradient falls back to the solid `--run-pink`, so the border still paints. The white static edge is what separates the frame from the Hot Pink canvas, which closes [ISSUE-009](KNOWN_ISSUES.md). The frame is wider (`max-w-5xl` against the page's `max-w-6xl`) and the slides grew with it — `86cqi`, then `26rem` and `30rem` at the `sm` and `lg` breakpoints — so the featured polaroid scales up without distortion. Because the frame clips its contents, the peeking neighbouring polaroids run off the frame's rounded edge instead of crossing the border; the track still scrolls natively and the dots, arrows and arrow keys are unaffected. Gallery cards keep `--polaroid-radius` `4px` and remain unanimated, so the effect is confined to the hero.

---

## D-021 — The favicon is a vector bow from the brand palette

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The favicon is the homepage's pink bow. The homepage bow is the 🎀 emoji rendered by the system font (`BowSticker` in `components/scrapbook/doodles.tsx`), not an image, so the icon is a **hand-drawn vector of that bow** — two loops, a knot and two ribbon tails — in brand values only: Candy Pink `#FF4FA3` loops, Deep Candy Pink `#F02E8D` knot and tails, a Soft White `#FFF8FA` highlight. It ships through Next's metadata file conventions as `app/icon.svg` (scalable, `sizes="any"`), `app/favicon.ico` (16/32/48 PNG-in-ICO) and `app/apple-icon.png` (180×180, bow on Soft White). No `metadata.icons` entry and no `layout.tsx` change is made: the files themselves produce the `<link>` tags.
- **Context:** The brief asked the favicon to reuse the existing homepage bow rather than introduce a new logo. An emoji glyph cannot be redistributed as an asset or scaled as vectors, and rendering the emoji itself would depend on the viewer's platform font.
- **Consequences:** The vector is an approximation of the emoji's shape, not the glyph itself; if the homepage bow is ever replaced by a real SVG, the favicon should be regenerated from that file so the two stay identical. The PNG and ICO rasters are derived from `icon.svg` (rasterised at high density and downscaled, so the 16px icon keeps clean edges) and are committed as binaries; regenerating them currently means re-running that rasterisation rather than a repo script. `apple-icon.png` is opaque because iOS fills transparent corners with black, while `icon.svg` and the ICO keep a transparent background. The bow is centred to within half a pixel at 16, 32 and 48px.

## D-022 — Navigation shows its eventual shape, with unbuilt destinations marked unavailable

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The site navigation is one component (`components/nav/site-nav.tsx`) rendered by the root layout: a white paper bar with the bow mark and "Mimori", five destinations, and an Add Memory action. Home links to `/` and Gallery to `/#gallery` — the homepage section that exists. Folders, Photo Booth and Widgets have no route or UI, so they render as non-interactive entries with `aria-disabled` and a "coming soon" title instead of links to invented pages. The Add Memory button, which has no upload flow behind it, is rendered in the design's pink but carries the `disabled` attribute and an explanatory title. The desktop bar appears from `lg`; below that, a compact top bar plus a fixed bottom bar carry the same destinations.
- **Context:** The brief asked for five destinations and a primary add action, but the project currently has a single route (`/`), no upload or API layer and no other pages. Inventing routes or a fake upload flow was explicitly ruled out.
- **Consequences:** The navigation looks complete without lying about what exists, and each gap is recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) (ISSUE-010, ISSUE-011). Adding a route later is a one-line change in the `DESTINATIONS` array — the link appears and the entry stops being disabled automatically. The stacked breakpoint was chosen over `md` so the five labels never overflow the bar on tablets. The active pill uses Deep Candy Pink on Blush Pink at **3.10:1**, below WCAG AA for normal text; the palette is fixed ([D-008](#d-008--colour-system-fixed-brand-palette-semantic-roles-native-theme)) so no compensating colour was invented.

## D-023 — Navigation rename: Folders to Collections, Widgets removed, dynamic Add button

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The navbar navigation was updated: "Folders" renamed to "Collections", "Widgets" removed from the navigation items. The Add Memory button is **dynamic**: its label changes based on the active page (`usePathname()`), mapping Home→"+ Add Widgets", Gallery→"+ Add Memory", Collections→"+ Add Collection", Photo Booth→"+ New Photo Booth". All four labels render in the button's pink styling but are marked `disabled=true` with explanatory hints, because none of the creation flows (widget creation, collection creation, Photo Booth creation, or memory upload) are built yet. The mobile bottom navigation mirrors the desktop items. Adding a route later is a one-line change in the `DESTINATIONS` array — the link appears and the entry stops being disabled automatically.
- **Context:** The brief requested renaming Folders to Collections and removing Widgets from navigation, plus a dynamic button that reflects the current page. Since no creation flows exist yet, the button labels are informative placeholders with `disabled` state, following the existing pattern of the Add Memory button. Navigation gaps are recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) (ISSUE-010).
- **Consequences:** The navigation now has four destinations (Home, Gallery, Collections, Photo Booth) instead of five. The Add Memory button shows different labels on different pages. Both desktop and mobile bars update their labels when navigating. Future route additions will automatically enable the corresponding entries and button actions.

## D-024 — Clickable cursor is an explicit `cursor-pointer` utility per control

- **Status:** Accepted — supersedes the single base-layer selector tried first.
- **Date:** 2026-11-02
- **Decision:** Each clickable control adds Tailwind's `cursor-pointer` to its own `className`: the brand link, the desktop and the mobile destination links, the mobile menu toggle, both carousel arrows (through the shared `arrowButton` constant) and every carousel dot. There is **no global cursor rule** in `app/globals.css`. Disabled and unavailable controls keep their own cursor instead — `disabled:cursor-not-allowed` on the Add button and the arrows, `cursor-default` on the `aria-disabled` Collections and Photo Booth entries.
- **Context:** The first implementation put one `:is(...)` selector in the base layer, which covered every control at once. The project's convention is that component styling lives beside the component, so the choice was revised in favour of explicit utilities.
- **Consequences:** The cursor is visible next to the markup it affects, and no global selector has to be reasoned about when reading a component or when overriding a cursor. The cost is that a new control must add the class itself — nothing supplies it automatically, and Tailwind 4.3.3's preflight gives `<button>` no pointer cursor — while a disabled control needs the matching disabled cursor instead. Non-interactive surfaces (polaroid frames, gallery photos, decorative stickers, page text, the carousel's scroll container and the mobile bar's tap-to-dismiss wrapper) deliberately carry no cursor class and are not made clickable by this convention.

## D-025 — Widget arrangement is stored in `Widget.config`; no migration was needed

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** The Home Page widget desktop persists through the existing global `Widget` table with **no schema change and no migration**. `Widget.type` holds one of the eight catalogue kinds, `Widget.name` the catalogue title, and `Widget.config` a JSON object: `{ kind, photoIds, text, date, position: { x, y }, size, z }`. Photos are ids from the gallery manifest (`lib/photos.ts`) and are validated server-side against that manifest; no image is copied. Reads and writes go through Route Handlers (`GET`/`POST` on `/api/widgets`, `PATCH`/`DELETE` on `/api/widgets/[id]`) that use a cached Prisma client built with `@prisma/adapter-pg`, which Prisma 7 requires.
- **Context:** The approved schema already carried a JSON `config` column precisely so widget kinds would not need migrations. The gallery is manifest-backed rather than database-backed ([D-015](#d-015--homepage-photo-source-local-manifest-not-the-database)), so there are no `Photo` rows a `WidgetPhoto` link could reference.
- **Consequences:** Adding or renaming a widget setting is an application change only. `WidgetPhoto` remains unused until photos are stored in `Photo`; when that happens, widget photo references should move from `config.photoIds` to that join table, and the manifest validation should become a `photoId` foreign key. The JSON is parsed defensively on read, so a row written by an older build cannot break the page. The widget layout is global — one shared arrangement for the whole application, not per-visitor storage ([D-013](#d-013--single-shared-mimori-with-no-user-or-ownership-model)). Server-side validation rejects unknown kinds, unknown or duplicated photo ids, photo counts outside a style's range, impossible dates and text over 280 characters (`lib/widgets/validate.ts`, covered by unit tests).

---

## D-026 — The widget canvas: grid positions, a borderless section and drag with motion values

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision:** Widgets sit at absolute pixel coordinates on a shared canvas and snap to a 16px grid. Positions are clamped to the canvas and an overlapped drop is pushed to the nearest free grid slot, so two widgets never stack by accident. The canvas is **not a panel**: the widgets area is a plain full-width section between the hero carousel and the photo gallery, with no heading, caption, border, background or shadow around it, and the navbar's dynamic **+ Add Widgets** action is its only entry point. There is **no Arrange mode** — every widget is draggable at all times, and its own round options handle (top-right, always rendered, revealed on hover and focus) opens send backward / bring forward / change size / edit / remove. Content is `pointer-events-none`, so a drag can start anywhere on a piece and a photo can never swallow the gesture. The visual drag offset lives in two motion values and is reset to zero when the drop is committed, so dragging never re-renders the tree and the card does not render its offset twice. Sizes follow three presets (small 208×228, medium 288×268, large 384×320), cycled from the options handle; layer order is the stored `z`, with forward/backward swapping neighbours and renumbering the stack.
- **Context:** The brief asked for macOS-style free positioning with snapping, overlap prevention, resize and layer order, on mouse and touch, without drags firing widget interactions. A later refinement asked for the widgets to read as pieces placed directly on the scrapbook page, so the surrounding container, the section heading and the arrange-mode switch were removed.
- **Consequences:** Every widget owns its own controls, so a widget is movable and editable on a phone without a global mode ([ISSUE-014](KNOWN_ISSUES.md) records the one cost: a touch that starts on a widget moves it rather than scrolling the page, because drag needs `touch-action: none`). The empty state is text pointing at the navbar action instead of a button, to keep that action the single entry point. A stray touch can also move a piece, which is intentional — exactly what a desktop-with-widgets behaves like — and a failed write restores the previous position. Positioning is a single global layout in absolute pixels, not per breakpoint: on a narrow screen the CSS `min()` clamp keeps every card inside the canvas and the layout is not saved again, so a desktop arrangement is simply pulled inward rather than rewritten ([ISSUE-013](KNOWN_ISSUES.md)). The canvas measures itself with a `ResizeObserver` plus a `window.resize` listener; because observers can be throttled in embedded or background surfaces, the card styles also use `min()`/`aspect-ratio`, which keeps a widget on-canvas even when the measured width is stale. Every drop writes once, on release. The placement rules (`lib/widgets/layout.ts`) are pure functions with unit tests for clamping, snapping, gap handling and overlap resolution.

## Adding a decision

Record a decision when a choice constrains future work: framework or library adoptions, data-model structure, authentication approach, PWA behaviour, hosting, or a product-scope change. Use the next free `D-` number and include status, date, decision, context and consequences.
