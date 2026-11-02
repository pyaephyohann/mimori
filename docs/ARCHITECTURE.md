# Architecture

Mimori is a PWA-first Next.js application. No product feature has been implemented yet; only a design-system foundation exists. This document records that foundation, the intended structure and the questions still open. Anything not decided is marked `TBD`.

## Current state

| Area | State |
| ---- | ----- |
| Application code | Next.js App Router with one route, the scrapbook homepage (`app/page.tsx`). |
| Routing | App Router (`app/layout.tsx`, `app/page.tsx`). Only `/` exists. |
| UI components | Hero carousel, photo gallery, widget desktop, "Our Love Story" section and polaroid/doodle primitives — see [Frontend structure](#frontend-structure). |
| Design system | Colour, status and typography tokens centralized in `app/globals.css`; Roboto/Caveat loaded in `app/layout.tsx`. See [Design system](#design-system). |
| Data layer | Prisma 7.10.1 schema and migration, applied to a local PostgreSQL 18.6 `mimori` database; client generated and queried through the widget API only ([Data layer](#data-layer)). |
| API layer | Two Route Handlers for the widget desktop: `/api/widgets` and `/api/widgets/[id]` ([D-025](DECISIONS.md)). |
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

- No ownership model: `Folder`, `Photo`, `Widget` and `WidgetPhoto` are global to the single Mimori collection, with no `User` table or `userId` column ([D-013](DECISIONS.md)).
- `Photo` is the single table for all images. Gallery and Photo Booth are filtered views over `Photo.kind`, not separate stores.
- `Folder` groups photos; a photo may be unfiled, and deleting a folder un-files its photos instead of deleting them.
- `Widget` selects photos through the ordered join `WidgetPhoto`; widget-specific settings live in a JSON `config` column so new widget kinds need no migration.
- Images are not stored in PostgreSQL: `Photo` holds the Cloudinary `secureUrl` and `publicId` ([D-011](DECISIONS.md)).

Prisma's connection string comes from `prisma7.config.ts`, which reads `DATABASE_URL`. The generated client is written to `generated/prisma` and git-ignored rather than committed.

The driver adapter `@prisma/adapter-pg` is installed and `lib/db.ts` exposes one cached `PrismaClient`. Reads and writes currently happen only through the two widget Route Handlers; there are no server actions and no other queries. The schema **has** been applied to the local `mimori` database through `prisma/migrations/20261101193126_init_global_photo_system`; no production database exists.

Widget rows keep their whole configuration in the JSON `config` column, so the layout needed no migration. Photo references are manifest ids rather than `WidgetPhoto` rows until photos live in `Photo` ([D-025](DECISIONS.md)).

## Frontend structure

```text
app/
  layout.tsx              root layout, fonts, metadata, site navigation
  page.tsx                composes the homepage (server component)
  globals.css             design tokens + scrapbook motion primitives
  icon.svg                bow favicon, scalable (Next metadata file convention)
  favicon.ico             16/32/48 bow icons for older browsers
  apple-icon.png          180x180 bow on paper for iOS home screens
components/
  nav/
    site-nav.tsx          client — desktop bar, mobile bar + bottom nav, active state
    nav-icons.tsx         hand-drawn navigation icons
  hero-carousel.tsx       client — scroll-snap carousel, dots, buttons, arrow keys
  photo-gallery.tsx       client — scrapbook grid
  our-love-story.tsx      server — title band
  scrapbook/
    polaroid.tsx          frame, image, caption, optional bow/heart, tilt
    doodles.tsx           heart, curly arrow, spiral, bow sticker
    running-border.tsx    client — rotating gradient rings for the hero frame
  widgets/
    widgets-provider.tsx  client — widget list, dialog state, optimistic writes
    widget-canvas.tsx     client — borderless widget area, always-on drag, snap, sizes, layer order
    widget-renderer.tsx   the eight widget layouts
    widget-style-preview.tsx  catalogue miniature
    add-widget-dialog.tsx client — style → photos → preview → save
app/api/widgets/
  route.ts                GET list, POST create
  [id]/route.ts           PATCH update, DELETE remove
lib/
  db.ts                   cached Prisma client with the Postgres adapter
  widgets/
    catalog.ts            kinds, sizes, grid, days-since helper
    validate.ts           server-side payload validation
    layout.ts             clamp, snap, overlap and placement rules
    server.ts             read/write widgets in `Widget.config`
    *.test.ts             node:test coverage of validation and geometry
  photos.ts               photo manifest and `Photo` type
  randomize.ts            pure ordering rules
  randomize.test.ts       node:test coverage of those rules
  photo-order.ts          localStorage read/write and `randomizeForVisit`
  use-shuffled-photos.ts  client hook applying an order once per mount
```

- The page is a server component; only the two randomising lists are client components, so the rest ships no client JS.
- Photos render through `next/image` with `fill` and `sizes` inside a `4/3` window. The source photos are 4:3, so a portrait crop would cut faces.
- Randomisation: `useShuffledPhotos` renders the given order on both server and client, then applies the stored rules after mount. That avoids hydration mismatches, and a signature guard means re-renders — including a new array holding the same photos — never reshuffle ([D-017](DECISIONS.md)).
- Carousel: native horizontal scrolling with `snap-x snap-mandatory`. The active slide is derived from the scroll offset, so touch, trackpad, buttons and dots share one source of truth. Slide width and the centring padding are both derived from one container-query unit, which keeps the active polaroid centred at every breakpoint.
- The hero sits in one rounded frame (`--carousel-radius`, `max-w-5xl`) with a static pure white edge that carries the animated running border: two masked rings inset in the frame, a conic gradient built from the page's Hot Pink and rotated by framer-motion, and a `--carousel-glow` halo outside it. The frame clips its contents, so the peeking neighbouring polaroids stop at its rounded edge. Polaroid frames have no animation of their own ([D-020](DECISIONS.md)).
- Decoration is `aria-hidden` and `pointer-events-none`, and moves only through the `.scrapbook-float` / `.scrapbook-sway` primitives and the border's rotation, all of which are disabled under `prefers-reduced-motion`.
- Photo Booth and folders have no UI, and the gallery still reads the local manifest ([D-015](DECISIONS.md)). The widget desktop is the only database-backed feature: `WidgetsProvider` fetches once, writes through the API, and keeps a drag optimistic, reverting on a failed write ([D-025](DECISIONS.md), [D-026](DECISIONS.md)).
- The widget area is an open full-width section between the hero and the gallery — no heading, caption, border, background or shadow, and the navbar's **+ Add Widgets** is its only entry point. Widgets are positioned absolutely and are draggable at all times, with a per-widget options handle for size, edit, layer order and remove. Drops snap to a 16px grid, clamp to the canvas and resolve overlaps by finding the nearest free slot; the drag offset is a motion value, so a drag does not re-render the tree.

## Design system

All design tokens live in `app/globals.css`, in four layers:

1. **Brand palette** — `--brand-hot-pink` (page background), `--brand-rose-pink`, `--brand-candy-pink`, `--brand-deep-candy-pink`, `--brand-soft-white`, `--brand-blush-pink`, `--brand-warm-charcoal`, `--brand-dusty-rose`, `--brand-white`. Fixed HEX values, identical in both themes.
2. **Semantic roles** — `--background`, `--surface`, `--surface-muted`, `--border`, `--heading`, `--foreground`, `--muted-foreground`, `--primary`, `--primary-hover`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--ring`. These are re-mapped for the dark theme, with two exceptions that are identical in both themes: `--background` is Hot Pink `#FF69B4` ([D-010](DECISIONS.md)) and the paper trio `--paper` / `--paper-foreground` / `--paper-edge` keeps scrapbook cards white ([D-018](DECISIONS.md)). Dark-theme text tokens are tuned for the dark surfaces, not for that background — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
3. **Status families** — `success`, `warning`, `danger`, `info`, `neutral`, each with a foreground, `-surface` and `-border` token.
4. **Typography** — `--font-body` (Roboto) and `--font-script` (Caveat).

Tailwind's `@theme inline` block maps every token, so `bg-surface`, `text-heading`, `border-border`, `text-success`, `bg-success-surface` and `font-decorative` resolve to whichever variables the active theme defines. Fonts are self-hosted by `next/font` in `app/layout.tsx`.

Component conventions:

- Use semantic tokens in components; reach for `--brand-*` only where the exact brand colour must survive both themes.
- Cards that must look like paper — polaroids and the empty states — use the `paper` tokens, not `--surface`.
- Never hardcode colour values in a component — add a token instead.
- Caveat is opt-in through `font-decorative`, only for short decorative text.

Theme handling: light and dark are selected by `prefers-color-scheme`, and `color-scheme` is set so native controls match. There is no switcher UI. A future switcher only needs to override the semantic variables on `:root` or a `[data-theme]` attribute; components stay unchanged.

Known contrast constraints of the fixed palette are listed in [KNOWN_ISSUES.md](KNOWN_ISSUES.md); decisions are recorded in [D-007](DECISIONS.md) and [D-008](DECISIONS.md).

## Pending architecture decisions

| Topic | Question | Status |
| ----- | -------- | ------ |
| Rendering model | Which routes are server-rendered, static, or client-rendered? | TBD |
| Data access boundary | Server Components only, route handlers, server actions, or a mix? | Partly decided: widget reads and writes use Route Handlers ([D-025](DECISIONS.md)); other features remain TBD |
| Mutations | Which mechanism is used for writes, and how are they validated? | Widgets: `fetch` from a client provider, validated in `lib/widgets/validate.ts` and again by the schema; other features TBD |
| State management | Local React state only, or a client store? | Partly decided: a small React context for widgets ([D-026](DECISIONS.md)); other features TBD |
| Authentication and session handling | Provider, session strategy, protected-route strategy. | TBD |
| Media storage | Object storage vs. database, upload pipeline, transformations. | Provider decided: Cloudinary, references only ([D-011](DECISIONS.md)); pipeline TBD |
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
