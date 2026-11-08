# Architecture

Mimori is a PWA-first Next.js application. No product feature has been implemented yet; only a design-system foundation exists. This document records that foundation, the intended structure and the questions still open. Anything not decided is marked `TBD`.

## Current state

| Area | State |
| ---- | ----- |
| Application code | Next.js App Router with four routes: the scrapbook homepage (`/`), the gallery (`/gallery`) and the collections index and detail pages (`/collections`, `/collections/[id]`). |
| Routing | App Router (`app/layout.tsx`, `app/page.tsx`, `app/gallery/page.tsx`, `app/collections/**`). |
| UI components | Hero carousel, photo gallery and viewer, widget desktop, collections library and collection detail, "Our Love Story" section and polaroid/doodle primitives — see [Frontend structure](#frontend-structure). |
| Design system | Colour, status and typography tokens centralized in `app/globals.css`; Roboto/Caveat loaded in `app/layout.tsx`. See [Design system](#design-system). |
| Data layer | Prisma 7.10.1 schema and two migrations, applied to a local PostgreSQL 18.6 `mimori` database; client generated and queried through the widget and collection APIs ([Data layer](#data-layer)). |
| API layer | Widget routes (`/api/widgets`, `/api/widgets/[id]`), collection routes (`/api/collections`, `/api/collections/[id]`, `/api/collections/move`), the photo upload route (`/api/photos/upload`), the gallery photo list and single-photo rename/delete (`/api/gallery`, `/api/gallery/[id]`) and the hero carousel route (`/api/hero`) ([D-025](DECISIONS.md), [D-029](DECISIONS.md), [D-030](DECISIONS.md), [D-032](DECISIONS.md), [D-033](DECISIONS.md), [D-041](DECISIONS.md)). |
| Authentication | None. |
| PWA layer | None. No manifest, service worker or install configuration exists. |
| Background jobs | None. |
| Deployment | `TBD`. |

## Intended shape (to be refined as the project grows)

The expected layering, subject to confirmation as each layer is built:

```text
Browser / installed PWA
        │
        ▼
Next.js application
  ├── routing and page composition (App Router)
  ├── UI components
  ├── server-side data access
  └── route handlers / server actions for mutations
        │
        ▼
Prisma
        │
        ▼
PostgreSQL
```

Every layer above is `TBD` in its details. The diagram describes the confirmed technology direction only.

## Data layer

The data model is defined in [`prisma/schema.prisma`](../prisma/schema.prisma) and documented field by field in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md). Its shape, in brief:

- No ownership model: `Folder`, `CollectionPhoto`, `Photo`, `Widget`, `WidgetPhoto`, `PhotoboothSession` and `PhotoboothShot` are global to the single Mimori collection, with no `User` table or `userId` column ([D-013](DECISIONS.md)).
- `Photo` is the single table for all images. Gallery and Photo Booth are filtered views over `Photo.kind`, not separate stores.
- A saved photobooth is two tables that only *reference* photos: `PhotoboothSession` holds the editor settings and points at its print (an ordinary `GALLERY` photo), and `PhotoboothShot` lists its captures in order (`PHOTO_BOOTH` photos) ([D-037](DECISIONS.md)).
- `Folder` groups photos and is also the Collections model, with `pinned` and a cover; its photos live in the ordered `CollectionPhoto` join ([D-029](DECISIONS.md)).
- `Widget` selects photos through the ordered join `WidgetPhoto`; widget-specific settings live in a JSON `config` column so new widget kinds need no migration.
- Images are not stored in PostgreSQL: `Photo` holds the Cloudinary `secureUrl` and `publicId` ([D-011](DECISIONS.md)).

Prisma's connection string comes from `prisma7.config.ts`, which reads `DATABASE_URL`. The generated client is written to `generated/prisma` and git-ignored rather than committed.

The driver adapter `@prisma/adapter-pg` is installed and `lib/db.ts` exposes one cached `PrismaClient`. Reads and writes happen through Route Handlers — widgets, collections, and photo uploads — plus the gallery page's server-side loader; there are no server actions. The schema **has** been applied to the local `mimori` database through three additive migrations — `20261101193126_init_global_photo_system`, `20261103093000_add_collections` and `20261103091753_add_photo_booth_sessions`; no production database exists.

Widget rows keep their whole configuration in the JSON `config` column, so the layout needed no migration. One reserved row (`type = "hero-carousel"`) holds the carousel's eight slots in the same column as `{ slots: [{ slotId, photoId, title }] }`; it is not a widget and `/api/widgets` filters it out ([D-032](DECISIONS.md), [D-033](DECISIONS.md)). Every photo reference in the application is now a `Photo` row id: widget `config.photoIds`, `CollectionPhoto.photoId`, `Folder.coverPhotoId` and the hero's `photoId` are all validated against the `Photo` table on write and filtered against it on read ([D-033](DECISIONS.md)). `WidgetPhoto` remains unused because widget photos still live in `config`; `CollectionPhoto.photoId` still has no foreign key, so membership is filtered rather than enforced by the database. Collections do need their own table: `Folder` gained `pinned` and `coverPhotoId`, and `CollectionPhoto` stores membership order, added by the additive migration `20261103093000_add_collections` ([D-029](DECISIONS.md)).

## Frontend structure

```text
app/
  layout.tsx              root layout, fonts, metadata, site navigation, page transition
  page.tsx                composes the homepage (server component)
  gallery/
    page.tsx              gallery page: title band, upload action, photo grid (server component)
  collections/
    page.tsx              collections library (server page wrapper)
    [id]/
      page.tsx            one collection; blocking route + Suspense for params
  photo-booth/
    page.tsx              photobooth setup page: title band + client setup screen
  globals.css             design tokens + scrapbook motion primitives
  icon.svg                bow favicon, scalable (Next metadata file convention)
  favicon.ico             16/32/48 bow icons for older browsers
  apple-icon.png          180x180 bow on paper for iOS home screens
components/
  nav/
    site-nav.tsx          client — desktop bar, mobile bar + bottom nav, active state
    nav-icons.tsx         hand-drawn navigation icons
  hero-carousel.tsx       client — scroll-snap carousel, dots, buttons, arrow keys
  photo-gallery.tsx       client — scrapbook grid and photo viewer state
  gallery/
    photo-lightbox.tsx    client — photo viewer: title, prev/next, keys, focus
    hero-image-picker.tsx client — choose which of the eight carousel slots a gallery photo fills
    gallery-upload.tsx    client — upload dialog (picker, previews, progress, retry)
    gallery-upload-context.ts  client — context and `useGalleryUpload` hook
    gallery-upload-provider.tsx client — mounts the one upload dialog for the app
    gallery-photos-provider.tsx client — fetches `/api/gallery` once for every picker
  our-love-story.tsx      server — title band
  scrapbook/
    polaroid.tsx          frame, image, caption, optional bow/heart, tilt
    photo-placeholder.tsx colourful empty square used by empty slots and pickers
    doodles.tsx           heart, curly arrow, spiral, bow sticker
    running-border.tsx    client — rotating gradient rings for the hero frame
    heart-outline.tsx     hand-drawn heart that draws itself behind a page heading
    page-transition.tsx   client — the page settle on navigation, mounted by the layout
  collections/
    collections-provider.tsx  client — collection list, dialog state, mutations
    collection-dialog.tsx     client — create/edit form with gallery photo choice
    collections-page.tsx      client — header, search, sort, pinned grid, recently added
    collection-card.tsx       client — paper cover card and portalled action menu
    collection-detail.tsx     client — photos, add/remove/move, cover, pin, delete
    photo-book.tsx            client — the collection as a bend-and-turn photo book
    photo-choice-grid.tsx     shared selectable gallery grid
    modal-shell.tsx           shared dialog chrome
    confirm-dialog.tsx        destructive-action confirmation
  toast/
    toast-provider.tsx    client — the app's one toast: provider, `useToast()`, viewport
  widgets/
    widgets-provider.tsx  client — widget list, dialog state, optimistic writes
    widget-canvas.tsx     client — borderless widget area, always-on drag, snap, sizes, layer order
    widget-renderer.tsx   the eight widget layouts
    widget-style-preview.tsx  catalogue miniature
    add-widget-dialog.tsx client — style → photos → preview → save
  photo-booth/
    photo-booth.tsx       client — the session: saved-booth library, sheet open state, choices, captures, editor config, saved id and setup → camera → review → editor
    setup-dialog.tsx      client — the new-booth sheet, same shell as the Add Widgets dialog
    setup-step.tsx        client — the three selection sections, the live preview and Start
    option-card.tsx       reusable selection card (preview, title, blurb, selected check)
    border-preview.tsx    SVG miniature drawn from `composeBooth` geometry
    paper-pattern.tsx     shared SVG paper pattern (dots, rules, film sprockets)
    camera-step.tsx       client — stream lifecycle, countdown pass, shutter, switch, torch, progress
    countdown.tsx         client — deadline-based 3-2-1 hook and overlay
    capture-strip.tsx     client — the session's filled slots and waiting placeholders
    review-step.tsx       client — the shots in the print geometry, per-photo and full retakes
    editor-step.tsx       client — the five-tab editor, live print and Finish rendering
    composition-preview.tsx  the print: paper, photos, caption, decorations and draggable stickers
    sticker-picker.tsx    palette, placed sticker list, size/tilt/remove
    editor-slider.tsx     shared labelled range control
    save-bar.tsx          Back to review and Finish editing
    save-panel.tsx        client — the finished print, save progress, success and download
app/api/widgets/
  route.ts                GET list, POST create
  [id]/route.ts           PATCH update, DELETE remove
app/api/collections/
  route.ts                GET list, POST create
  [id]/route.ts           GET one, PATCH update, DELETE remove
  move/route.ts           POST move photos between collections
app/api/photos/
  upload/route.ts         POST one image: validate, upload to Cloudinary, write Photo
app/api/gallery/
  route.ts                GET the gallery's photos for client pickers
  [id]/route.ts           PATCH rename, DELETE remove a photo, its references and its asset
app/api/hero/
  route.ts                GET the eight carousel slots, POST fill one from a gallery photo
app/api/photo-booth/
  route.ts                GET saved sessions, POST save one after validating its photos
  [id]/route.ts           GET one session with its ordered captures and print
lib/
  db.ts                   cached Prisma client with the Postgres adapter
  cloudinary.ts           server-only signed upload and asset cleanup
  photo.ts                the one `Photo` shape every image has in the UI
  gallery-photos.ts       server-only loaders: gallery list, photo ids, photos by id
  gallery-source.ts       pure row → photo mapping with distinct empty / failed states
  gallery-delete.ts       server-only transactional delete: rows, JSON references, then asset
  gallery-cleanup.ts      pure removal of a photo id from widget and carousel config
  gallery-cleanup.test.ts node:test coverage of those rewrites
  cloudinary-result.ts    pure interpretation of an image/destroy answer
  cloudinary-result.test.ts node:test coverage of gone / missing / failed
  photo-upload.ts         shared upload rules: formats, size, kinds, sniffing, filenames
  photo-upload.test.ts    node:test coverage of those rules
  gallery-upload-client.ts  browser XHR upload with real progress, shared by gallery and booth
  gallery-source.test.ts  node:test coverage of the empty and failed cases
  hero/
    slots.ts              pure eight-slot model: parse, build, assign, validate
    slots.test.ts         node:test coverage of those rules
    server.ts             server-only read/write of the reserved hero row
  collections/
    catalog.ts            collection type, limits, sort/search/cover helpers
    validate.ts           server-side payload validation
    server.ts             Prisma reads/writes, transactional moves
    http.ts               store-error → API response mapping
    validate.test.ts      node:test coverage of the rules
  widgets/
    catalog.ts            kinds, sizes, grid, days-since helper
    validate.ts           server-side payload validation
    layout.ts             clamp, snap, overlap and placement rules
    server.ts             read/write widgets in `Widget.config`
    *.test.ts             node:test coverage of validation and geometry
  photo-booth/
    catalog.ts            supported photo counts, strip/collage layouts, defaults
    borders.ts            the six declarative border templates
    stickers.ts           the shared emoji sticker registry
    compose.ts            pure geometry: frame, page, slots, caption, decorations
    camera.ts             getUserMedia constraints, error copy, stream and torch helpers
    capture.ts            canvas frame → JPEG blob, capture sizing, object-URL lifetime
    countdown.ts          pure remaining-time → countdown number
    backgrounds.ts        the six editor paper swatches
    editor.ts             editor config, caption/date rules, sticker helpers, caption fitting
    patterns.ts           dot/rule/sprocket measurements shared with the canvas
    client.ts             browser-only canvas renderer → JPEG through `toBlob()`
    save.ts               upload the captures and print, then save the session; retry cache
    session.ts            pure validation of a session payload and its referenced photos
    session.test.ts       node:test coverage of that validation
    server.ts             server-only session reads/writes in PostgreSQL
    *.test.ts             node:test coverage of geometry, editor rules, camera and capture sizing
  randomize.ts            pure ordering rules
  randomize.test.ts       node:test coverage of those rules
  photo-order.ts          localStorage read/write and `randomizeForVisit`
  use-shuffled-photos.ts  client hook applying an order once per mount
```

- Both pages are server components; the hero carousel, the gallery (with its viewer) and the widget area are the client components, so the title bands, polaroid frame and decorations ship no client JS.
- Photos render through `next/image` with `fill` and `sizes` inside a `4/3` window. The source photos are 4:3, so a portrait crop would cut faces.
- Randomisation: `useShuffledPhotos` renders the given order on both server and client, then applies the stored rules after mount. That avoids hydration mismatches, and a signature guard means re-renders — including a new array holding the same photos — never reshuffle ([D-017](DECISIONS.md)).
- Carousel: native horizontal scrolling with `snap-x snap-mandatory`. The active slide is derived from the scroll offset, so touch, trackpad, buttons and dots share one source of truth. Slide width and the centring padding are both derived from one container-query unit, which keeps the active polaroid centred at every breakpoint.
- The hero sits in one rounded frame (`--carousel-radius`, `max-w-5xl`) with a static pure white edge that carries the animated running border: two masked rings inset in the frame, a conic gradient built from the page's Hot Pink and rotated by framer-motion, and a `--carousel-glow` halo outside it. The frame clips its contents, so the peeking neighbouring polaroids stop at its rounded edge. Polaroid frames have no animation of their own ([D-020](DECISIONS.md)).
- Decoration is `aria-hidden` and `pointer-events-none`, and moves only through the `.scrapbook-float` / `.scrapbook-sway` primitives and the border's rotation, all of which are disabled under `prefers-reduced-motion`.
- `/photo-booth` is a static server page holding the title band and the client `PhotoBooth`, which shows the saved-booth library and a **+ New Photobooth** button; the setup only appears in a sheet opened from that button (or the navbar's **New Photo Booth** anchor), rendered with the Add Widgets dialog's shell — bottom sheet on phones, centred card from `sm`, backdrop, Escape and a close button — and every opening resets the choices to their defaults ([D-039](DECISIONS.md)). The setup sheet chooses 2, 3, 4 or 6 photos (default 4), a vertical strip or square collage (default strip) and one of six border templates (default Lovely Hearts) through `OptionCard`, the same card language as the widget style picker. Every miniature is the real print: `composeBooth()` (pure, no DOM) returns the frame, inner page, photo slots, caption plate and corner decorations for a config, `border-preview.tsx` draws those rectangles as SVG from the template's own colours and pattern, and the card can never show a shape the composition would not produce ([D-034](DECISIONS.md)). **Start Photobooth** then hands the same choices to the camera step, which requests `getUserMedia` only at that moment, shoots the configured number of photos through a deadline-based 3-second countdown, and stores each frame as a `<canvas>` JPEG in `PhotoBooth`'s state; the review step lays those captures into the same `composeBooth()` geometry. The editor decorates around them with a separate `BoothEditorConfig` — border, paper, fractional sticker placements, caption, date, spacing and thickness — and both its live preview and the 1600px canvas export in `lib/photo-booth/client.ts` read that one geometry, including the caption text boxes and the shared paper pattern numbers; changing a border is a state update, never a retake ([D-036](DECISIONS.md)). **Finish editing** renders that JPEG, and **Save to Gallery** uploads each capture as a `PHOTO_BOOTH` photo, uploads the print as an ordinary `GALLERY` photo through the same `/api/photos/upload` endpoint, and posts both to `/api/photo-booth`, which validates the rows and writes the session and its ordered shots in one create ([D-037](DECISIONS.md)). The finished print therefore appears in the Gallery, its pickers, collections and hero slots like any other uploaded photo, while the captures stay out of all of them because every gallery query filters `kind = GALLERY`. A save that fails after some uploads keeps those ids in a retry cache, so pressing save again continues instead of uploading twice; the captures and edits stay in memory until the session is saved. **Our Saved Photobooths** on the main page reads `GET /api/photo-booth` once, lists sessions newest first and opens one through `GET /api/photo-booth/[id]`; `lib/photo-booth/restore.ts` validates that payload and rebuilds the same `photoCount`, `layout`, `BoothEditorConfig` and shot list a fresh session would have, so the editor cannot tell the two apart. `lib/photo-booth/shots.ts` is what makes that possible: a `BoothShot` is either a capture (Blob plus object URL) or a saved photo (Cloudinary URL plus `Photo` id), and the editor, the preview and the renderer accept both. Opening a booth therefore needs no camera and no upload, and no original photograph is re-uploaded or replaced. An opened session's next save uploads only a replacement page and `PATCH /api/photo-booth/[id]` rewrites that one session's settings and `printPhotoId`; the request cannot change the captures, their count or the layout, and the replaced print is deleted — row and Cloudinary asset — only when no other session, collection, widget, hero slot or folder cover references it. The canvas renderer loads a saved photo with `crossOrigin = "anonymous"` so the canvas stays untainted and can still export, and it refuses to export rather than drawing a placeholder when a saved photo will not load. **Download print** always renders the current settings through that renderer, so a download is never an older stored page ([D-038](DECISIONS.md)). The gallery reads `Photo` rows and nothing else: an empty table renders the empty state and a failed query renders an error state, with no bundled pictures in either case ([D-033](DECISIONS.md)). Uploads go through `/api/photos/upload`, which signs the Cloudinary request server-side and registers the image, so no binary data reaches PostgreSQL. Three features are database-backed: the widget desktop, where `WidgetsProvider` fetches once, writes through the API and keeps a drag optimistic ([D-025](DECISIONS.md), [D-026](DECISIONS.md)); collections, where `CollectionsProvider` in the root layout fetches the shared list once so the library, a collection page and the navbar's **+ Add Collection** all read and update the same state ([D-029](DECISIONS.md)); and gallery uploads, whose dialog `GalleryUploadProvider` mounts once in the root layout so the navbar's **+ Add Memory** and the Gallery page's button open the same flow ([D-030](DECISIONS.md), [D-031](DECISIONS.md)). `GalleryPhotosProvider` sits above all three and fetches `/api/gallery` once, so every picker offers the same photos and a successful upload refreshes that one list.
- `/collections` is an empty-then-populated client page behind a small server wrapper, with white-on-pink title band, search, sort, a Pinned section, a responsive 2/3/4-column card grid, a create card at the end of the grid and a floating **+** that respects the mobile bar and safe areas. `/collections/[id]` is a blocking route (`instant = false`) because the layout navbar reads `usePathname()`, which cannot be resolved for an unknown dynamic param during prerendering; suspending the whole navbar instead would flash a missing header. The card action menu is portalled to `body` with fixed, flip-aware coordinates so the fixed mobile bottom bar cannot swallow its clicks.
- Collection cards keep the scrapbook language: paper frames, a photo cover, small alternating tilts, the hover lift, and a bow only when a collection is pinned. Deleting a collection or removing a photo only touches membership rows; the gallery's `Photo` record and its Cloudinary asset are never deleted. A confirmed collection deletion removes the card at once, closes the confirmation, and reports **Collection deleted successfully.** through the app-wide toast, which survives the hop from a deleted collection's own page to `/collections` ([D-043](DECISIONS.md)).
- `/` is hero → widget area → "Our Love Story"; it is a blocking, per-request page (`instant = false` + `connection()`) because the carousel's saved image replacements are read from the database on every visit ([D-032](DECISIONS.md)). The photo gallery moved to its own route, `/gallery`, which is a partially prerendered server page holding the scrapbook title band and a `<Suspense>` boundary around the gallery ([D-027](DECISIONS.md), [D-030](DECISIONS.md)). The title band carries no upload button: the navbar's **Add Memory** opens the shared upload dialog ([D-031](DECISIONS.md)). That boundary calls `connection()` before querying Prisma, so the grid streams per request with a small paper placeholder instead of being baked into the shell; a successful upload triggers `router.refresh()` to re-run it.
- - Every action that finishes now says so once, in the same place: `components/toast/toast-provider.tsx` holds the app's only toast — `useToast().showToast(message, tone?)` sets one message, a timer clears it after about three seconds, and the viewport draws it fixed, centred, above every dialog (`z-[90]`, clearing the mobile bottom bar) with a paper/pink heart style for success and the danger colours for an error, animated in and out with `framer-motion` unless reduced motion is requested. It is mounted outermost in the root layout so a message outlives the dialog, page or store that raised it, and a repeated message replaces the one on screen instead of stacking ([D-043](DECISIONS.md)). Deletions, uploads, title and hero edits, collection create/update/delete, widget save/remove and Photo Booth saves all report through it; failures that need action still keep their own inline error as well.
- The gallery viewer's **Delete image** action opens the shared `ConfirmDialog` as a second `elevated` layer, so its own Escape and backdrop clicks never close the photo behind it. Confirming calls `DELETE /api/gallery/[id]`, which deletes the `Photo` row, its `CollectionPhoto` rows, any `Folder.coverPhotoId` and its id inside every widget and carousel config, then destroys the Cloudinary asset with the row's own `publicId`; the viewer removes the photo from `GalleryPhotosProvider`, closes with its confirmation, and the app-wide toast reports **Image deleted successfully.** ([D-041](DECISIONS.md), [D-043](DECISIONS.md)). A booth print is refused, and a failed asset destroy is reported as a warning rather than a success.
- The gallery viewer's full-width pink **Set as HeroCarousel Image** button opens `components/gallery/hero-image-picker.tsx` above it (`ModalShell`'s `elevated` layer): the picker lists all eight slots from `/api/hero` — filled ones with their photo and title, empty ones as colourful squares — prefills a title field with the chosen slot's current title (or the photo's caption for an empty slot) and sends `{ slotId, sourceId, title }` on **Replace image** (the picture and the title are saved together; a blank title disables the button). The viewer ignores its own keys while the picker is open, so Escape closes only the picker. The server resolves the photo's URL from its `Photo` row, validates both and stores `{ slotId, photoId, title }` in the reserved hero row, leaving gallery records and uploads untouched. The home page renders a filled slot as a polaroid and an empty one as a paper-framed colourful square, and the failed-read state adds a quiet status line rather than borrowing pictures.
- The widget area is an open full-width section on the home page — no heading, caption, border, background or shadow, and the navbar's **+ Add Widgets** is its only entry point. Widgets are positioned absolutely and are draggable at all times, with a per-widget options handle for size, edit, layer order and remove. Drops snap to a 16px grid, clamp to the canvas and resolve overlaps by finding the nearest free slot; the drag offset is a motion value, so a drag does not re-render the tree.

## Design system

All design tokens live in `app/globals.css`, in four layers:

1. **Brand palette** — `--brand-hot-pink` (page background), `--brand-rose-pink`, `--brand-candy-pink`, `--brand-deep-candy-pink`, `--brand-soft-white`, `--brand-blush-pink`, `--brand-warm-charcoal`, `--brand-dusty-rose`, `--brand-white`. Fixed HEX values, identical in both themes.
2. **Semantic roles** — `--background`, `--surface`, `--surface-muted`, `--border`, `--heading`, `--foreground`, `--muted-foreground`, `--primary`, `--primary-hover`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--ring`. There is one set of values: `--background` is Hot Pink `#FF69B4` ([D-010](DECISIONS.md)) and the paper trio `--paper` / `--paper-foreground` / `--paper-edge` keeps scrapbook cards white ([D-018](DECISIONS.md)). Text tokens are tuned for surfaces, not for that background — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
3. **Status families** — `success`, `warning`, `danger`, `info`, `neutral`, each with a foreground, `-surface` and `-border` token.
4. **Typography** — `--font-body` (Roboto) and `--font-script` (Caveat).

Tailwind's `@theme inline` block maps every token, so `bg-surface`, `text-heading`, `border-border`, `text-success`, `bg-success-surface` and `font-decorative` resolve to whichever variables the active theme defines. Fonts are self-hosted by `next/font` in `app/layout.tsx`.

Component conventions:

- Use semantic tokens in components; reach for `--brand-*` only where the exact brand colour must survive both themes.
- Cards that must look like paper — polaroids and the empty states — use the `paper` tokens, not `--surface`.
- Never hardcode colour values in a component — add a token instead.
- Caveat is opt-in through `font-decorative`, only for short decorative text.

Motion conventions:

- Page-level motion lives in the layout, not in the pages: `PageTransition` wraps the content column, which is the only node that survives a navigation, and settles it with one Web Animation ([D-045](DECISIONS.md)). Routes get the effect by existing, not by each page opting in.
- Heading decoration is drawn behind the text. `HeartOutline` is absolutely positioned inside a `relative isolate` wrapper and rendered before the heading, so a stroke can never cover a letter; the heading carries `relative` to paint above it.
- Everything decorative stops under `prefers-reduced-motion`: the heart's CSS keyframe is switched off by a media query, and the page settle is skipped in JavaScript before an animation is created.

Theme handling: Mimori is **light mode only** ([D-028](DECISIONS.md)). There is no dark theme block, no `prefers-color-scheme` override and no switcher, so the operating system's dark preference changes nothing; `color-scheme: light` on `:root` keeps native controls (inputs, selects, scrollbars) light too. Every component reads the same semantic variables, so a future theme would only need to override them on `:root` or a `[data-theme]` attribute.

Known contrast constraints of the fixed palette are listed in [KNOWN_ISSUES.md](KNOWN_ISSUES.md); decisions are recorded in [D-007](DECISIONS.md) and [D-008](DECISIONS.md).

## Pending architecture decisions

| Topic | Question | Status |
| ----- | -------- | ------ |
| Rendering model | Which routes are server-rendered, static, or client-rendered? | TBD |
| Data access boundary | Server Components only, route handlers, server actions, or a mix? | Partly decided: widget reads and writes use Route Handlers ([D-025](DECISIONS.md)), the hero carousel is read in the page's server component and written through `/api/hero` ([D-032](DECISIONS.md)); other features remain TBD |
| Mutations | Which mechanism is used for writes, and how are they validated? | Widgets and collections: `fetch` from a client provider, validated in `lib/widgets/validate.ts` / `lib/collections/validate.ts` before reaching Prisma; other features TBD |
| State management | Local React state only, or a client store? | Partly decided: small React contexts for widgets and collections ([D-026](DECISIONS.md), [D-029](DECISIONS.md)); other features TBD |
| Authentication and session handling | Provider, session strategy, protected-route strategy. | TBD |
| Media storage | Object storage vs. database, upload pipeline, transformations. | Provider and pipeline decided: Cloudinary with server-signed uploads, references only ([D-011](DECISIONS.md), [D-030](DECISIONS.md)); transformations and asset deletion TBD |
| PWA configuration | Manifest, icons, service worker strategy, install prompts. | TBD |
| Offline behaviour | Required or not — not a confirmed feature. | TBD |
| Caching | Next.js caching strategy and invalidation. | TBD |
| Error handling | Boundaries, user-facing error states, logging. | TBD |
| Observability | Logging, error tracking, performance monitoring. | TBD |
| Environments | Local / preview / production separation. | TBD |
| Deployment target | Hosting platform and pipeline. | TBD |

## Design principles

- **Mobile-first.** Small screens define layout and interaction; larger viewports adapt upward.
- **Installable by design.** New work should not compromise the ability to deliver an installable PWA.
- **Web parity.** The browser experience must stay usable; installation is an enhancement, not a requirement.
- **One warm surface.** The product is small and personal, so prefer simple, cohesive solutions over flexible platform abstractions.
- **Server-first data access.** Data access and authorization belong on the server unless a specific case justifies otherwise.

## Constraints

- Follow [TECH_STACK.md](TECH_STACK.md); no new framework, database, state manager or styling system without a recorded decision in [DECISIONS.md](DECISIONS.md).
- Respect the Next.js version in this repository: consult the framework documentation shipped with the installed package when APIs or conventions are uncertain, since this version differs from widely known older releases.
- The data model is documented in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and must be updated in the same change as any schema work.
