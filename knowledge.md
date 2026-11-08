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
| Media    | Cloudinary (references only)  | Signed server-side uploads registered in `Photo`; the gallery viewer's delete removes the row and destroys its asset |

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
- **The user-facing surface is four areas**: the Romantic Scrapbook homepage (`/`) with a polaroid hero carousel, the widget desktop and an "Our Love Story" band; the gallery page (`/gallery`) with the scrapbook photo grid and a photo viewer whose title is each photo's own caption, with in-place **Edit title**, **Delete image** (confirmed, permanent — [D-041](docs/DECISIONS.md)) and **Set as HeroCarousel Image** ([FEATURES.md](docs/FEATURES.md), [D-014](docs/DECISIONS.md), [D-027](docs/DECISIONS.md), [D-030](docs/DECISIONS.md)); the collections library and detail pages (`/collections`, `/collections/[id]`) with pinning, covers, search, sorting, add/remove/move photos, rename and delete ([D-029](docs/DECISIONS.md)); and the photobooth (`/photo-booth`) with photo-count, strip/collage and six-border selection plus a live print, a camera that counts down and takes the chosen photos with retakes, a review, an editor for border, paper, stickers, caption, date, spacing and thickness that renders the exact print as a 1600px JPEG, and **Save to Gallery**, which uploads the captures as `PHOTO_BOOTH` photos and the print as an ordinary `GALLERY` photo and writes a `PhotoboothSession` with its ordered shots, with a download for the finished print. **Our Saved Photobooths** is that page's main content; **+ New Photobooth** opens the setup in the same sheet shell as the Add Widgets dialog (defaults every time), and a saved card reopens one straight in the editor with its original photographs and settings, where the next save updates that same session and replaces only its print ([D-039](docs/DECISIONS.md), [D-034](docs/DECISIONS.md), [D-035](docs/DECISIONS.md), [D-036](docs/DECISIONS.md), [D-037](docs/DECISIONS.md), [D-038](docs/DECISIONS.md)). **The `Photo` table is the only image source** ([D-033](docs/DECISIONS.md)): there is no bundled manifest any more, so the gallery's photos are Cloudinary URLs from `Photo` rows, an empty table shows the empty state and a failed query shows an error. Hero slots, collections and widgets all reference `Photo` ids. `public/couple-images` is still on disk (the `.HEIC` originals plus JPEG derivatives, [D-016](docs/DECISIONS.md)) but nothing references it. Hero and gallery orders randomise independently per visit ([D-017](docs/DECISIONS.md)).
- A Prisma schema exists for photos, folders/collections, widgets and Photo Booth ([docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)): five global models, **no user ownership** ([D-013](docs/DECISIONS.md)). A local PostgreSQL 18.6 database `mimori` is connected through a git-ignored `.env` and has three migrations applied — the initial photo schema, the additive collections one and the additive photobooth-session one. Gallery uploads are server-signed Cloudinary requests validated in `lib/photo-upload.ts`, which also accepts a validated `kind` so booth captures land under `mimori/photo-booth`; a gallery photo can now be deleted permanently from the viewer (row, references and Cloudinary asset, [D-041](docs/DECISIONS.md)), but there is still no authentication and no PWA configuration, and an unsaved session still lives only in the tab.
- The homepage also has a **customizable widget desktop**: eight widget styles, an Add Widgets dialog with gallery photo selection, and a drag/snap canvas with size presets, layer order, edit and remove ([D-025](docs/DECISIONS.md), [D-026](docs/DECISIONS.md)). It sits between the hero and the "Our Love Story" band with no panel, heading or Arrange mode: every piece drags at any time and carries its own options handle, and the navbar's **+ Add Widgets** is the only way to create one. Its arrangement lives in the existing `Widget.config` JSON — so **no migration was needed** for it — and `WidgetPhoto` stays unused. Photos are gallery `Photo` ids, picked from a grid that shows colourful placeholder tiles before the real photos; the dialog itself has no upload step, so photos are uploaded on `/gallery` first ([ISSUE-012](docs/KNOWN_ISSUES.md)).
- **The photobooth** is data-driven: `lib/photo-booth/catalog.ts` (counts, layouts, defaults), `borders.ts` (six declarative templates), `stickers.ts` and `compose.ts` (a pure geometry returning frame, slots, caption plate and decorations). The setup is a sheet (`components/photo-booth/setup-dialog.tsx`) rather than inline content, so the page itself stays a library of saved booths and the choices open only on request. `components/photo-booth/border-preview.tsx` draws that geometry as SVG, so the preview is the print rather than an illustration; the same data is meant to drive the editor and canvas export. The camera step uses plain browser APIs — `getUserMedia`, a `<video>` preview, `<canvas>` + `toBlob()` at most 1080px wide, no `ImageCapture` or camera library — with a deadline-based 3-second countdown, front-camera mirroring applied to both preview and photo, track teardown on switch/exit/unmount, and captures held in memory as Blobs plus object URLs ([D-035](docs/DECISIONS.md)). The editor keeps a separate `BoothEditorConfig` (border, paper, fractional sticker placements, caption, date, spacing, thickness), and `composeBooth()` now also returns the paper colour, clamped stickers and caption/date text boxes, so the live DOM preview and the canvas JPEG in `lib/photo-booth/client.ts` are the same layout; sticker/pattern numbers are shared through `lib/photo-booth/patterns.ts` ([D-036](docs/DECISIONS.md)). Saving (`lib/photo-booth/save.ts` + `POST /api/photo-booth`) uploads each capture and the rendered print through the same `/api/photos/upload`, caches successful uploads for retries, and writes `PhotoboothSession`/`PhotoboothShot`; the print then behaves like any Gallery photo and the captures stay out of the Gallery by `kind` ([D-037](docs/DECISIONS.md)). Reopening (`lib/photo-booth/restore.ts`, `components/photo-booth/saved-sessions.tsx`) rebuilds the same editor state from `GET /api/photo-booth/[id]`, with each original capture represented as a saved Cloudinary shot rather than a Blob (`lib/photo-booth/shots.ts`), so no camera or upload is needed; the canvas renderer loads those URLs `crossOrigin` and refuses to export if one fails. An edit uploads only a replacement page and `PATCH /api/photo-booth/[id]` rewrites that session's settings and print — never its captures, count or layout — then deletes the replaced print and its asset only when nothing else references it; **Download print** always renders the current composition as `mimori-our-little-moments.jpg` ([D-038](docs/DECISIONS.md)). An unsaved session still lives only in the tab ([ISSUE-021](docs/KNOWN_ISSUES.md)), an abandoned new-session save can leave unreferenced uploads ([ISSUE-024](docs/KNOWN_ISSUES.md)), real-device camera behaviour is unverified ([ISSUE-022](docs/KNOWN_ISSUES.md)), and the reopened editor's mobile and six-photo layouts were not re-checked ([ISSUE-025](docs/KNOWN_ISSUES.md)).
- **Collections** reuse the `Folder` model: `Folder.pinned` and `Folder.coverPhotoId` plus an ordered `CollectionPhoto` join whose `photoId` is a gallery `Photo` id with no foreign key, so no image record or upload is duplicated ([D-029](docs/DECISIONS.md), [D-033](docs/DECISIONS.md)). Deleting a collection or removing a photo never touches the gallery. Their API is `/api/collections`, `/api/collections/[id]` and `/api/collections/move`; the navbar's **+ Add Collection** opens the shared create dialog.
- Prisma 7 queries run through `@prisma/adapter-pg`; `lib/db.ts` exposes one cached `PrismaClient`, used by the widget and collection Route Handlers. Images are referenced from Cloudinary by URL and public id, never stored in PostgreSQL ([D-011](docs/DECISIONS.md)).
- Tests: `node --test "lib/*.test.ts" "lib/**/*.test.ts"` covers the ordering rules, widget validation and geometry, collection validation/sorting, upload rules, the gallery's empty/failed states, the hero's eight-slot rules, the photobooth's composition geometry (every photo count in both layouts, caption text boxes, paper and stickers), its editor rules (date formatting, caption normalisation and fitting, sticker placement and limits), its camera rules (error mapping, constraints, capture sizing, countdown), its saved-session validation (counts, borders, papers, dates, sliders, stickers, ids and photo kinds), the upload-kind allowlist, and its reopen/update rules (payload restoration and capture ordering, the update body refusing changed photos, print-signature reuse and PATCH retries, and the library's newest-first merge), with no extra dependency. `npx tsc --noEmit`, `npm run lint` and `npm run build` are the standard checks.
- Design tokens (brand palette, semantic roles, status colours, fonts) live in `app/globals.css`; usage rules and contrast limits are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#design-system) and [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).
- **Mimori is light mode only** ([D-028](docs/DECISIONS.md)): there is no dark theme, no `prefers-color-scheme` override and no switcher, and `color-scheme: light` keeps native controls light. Do not add a dark theme block or `dark:` utilities back.
- The page background is Hot Pink `#FF69B4` ([D-010](docs/DECISIONS.md)); the text tokens are tuned for surfaces, so text placed directly on the canvas has known contrast limits — check [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) before putting copy on the background.
- Completed milestones are recorded in [DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md).

## Development rules

1. Read [AGENTS.md](AGENTS.md) — the binding instructions — before any work.
2. Inspect existing code before implementing; never assume a file or dependency exists.
3. Stay inside the requested scope; no unrequested features, dependencies or refactors.
4. Never claim something is implemented unless it is built and verified. Use `TBD` for undecided items.
5. Update the documentation in the same task as verified work.
6. Never commit or push without explicit authorization.
7. Never read, print or commit secrets from `.env` files.
