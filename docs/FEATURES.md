# Features

The feature registry for Mimori. Every product capability is tracked here with its true status.

## Status definitions

| Status | Meaning |
| ------ | ------- |
| `PLANNED` | Agreed as needed, not started. |
| `IN_PROGRESS` | Actively being built; not usable end to end. |
| `IMPLEMENTED` | Code exists and works, but has not been verified against its requirements. |
| `VERIFIED` | Built **and** checked — the behaviour was exercised and confirmed. |
| `BLOCKED` | Cannot proceed because of an unresolved dependency or decision. |
| `DEPRECATED` | Still in the codebase but no longer supported; scheduled for removal. |

Use only one status per feature. `VERIFIED` is the only status that means "done"; never mark something `VERIFIED` without having tested it.

## Registry

| ID | Feature | Status | Notes | Last updated |
| -- | ------- | ------ | ----- | ------------ |
| PHOTO-1 | Photo gallery listing | `PLANNED` | `Photo` table and indexes exist ([D-012](DECISIONS.md)); no queries, UI or upload flow | 2026-11-02 |
| PHOTO-2 | Folders for organising photos | `PLANNED` | `Folder` model and `Photo.folderId` exist; no management UI or API | 2026-11-02 |
| PHOTO-3 | Photo widgets | `PLANNED` | `Widget` + ordered `WidgetPhoto` exist; no rendering or configuration UI | 2026-11-02 |
| PHOTO-4 | Photo Booth section | `PLANNED` | `Photo.kind = PHOTO_BOOTH` exists; no dedicated view or capture flow | 2026-11-02 |
| MEDIA-1 | Upload and delete photos via Cloudinary | `PLANNED` | Schema stores `secureUrl` / `publicId` only ([D-011](DECISIONS.md)); no SDK, upload preset or asset deletion | 2026-11-02 |
| HOME-1 | Romantic Scrapbook homepage | `VERIFIED` | `/` renders the approved scrapbook design; photos come from the local manifest, not the database ([D-015](DECISIONS.md)) | 2026-11-02 |
| HOME-2 | Hero photo carousel | `VERIFIED` | Native scroll-snap track with buttons, dots and arrow keys; per-visit random order ([D-017](DECISIONS.md)) | 2026-11-02 |
| HOME-3 | Scrapbook photo gallery | `VERIFIED` | Polaroid grid with its own random order; 1/2/3 columns at mobile/tablet/desktop | 2026-11-02 |
| HOME-4 | "Our Love Story" heading section | `VERIFIED` | Title band with the reference's heart and doodle arrangement | 2026-11-02 |
| HOME-5 | Hero carousel running border animation | `VERIFIED` | Slow running border in the page's own Hot Pink inside a static pure white edge that wraps the whole hero carousel container, with balanced frame padding and a soft white halo, `framer-motion` ([D-020](DECISIONS.md)); polaroid frames and carousel behaviour unchanged | 2026-11-02 |
| HOME-6 | Pink bow favicon | `VERIFIED` | Bow icon in `app/icon.svg`, `app/favicon.ico` (16/32/48) and `app/apple-icon.png` (180×180) through Next's metadata file conventions ([D-021](DECISIONS.md)); emitted in `<head>` and served with the right types | 2026-11-02 |
| WIDGET-1 | Home scrapbook widget desktop | `VERIFIED` | Eight widget styles (Polaroid, Photo Grid, Film Strip, Heart Collage, Photo Stack, Memory Frame, Love Note, Our Counter) in an Add Widgets dialog with gallery photo selection, live preview, drag/snap canvas, size presets, layer order, edit and remove; arrangement stored in `Widget.config` and restored after refresh ([D-025](DECISIONS.md), [D-026](DECISIONS.md)). The widgets sit on an open, borderless section between the hero carousel and the photo gallery, with no heading, caption or Arrange mode: every piece drags at any time and carries its own options handle. Photos are picked from the existing gallery manifest; the "upload new photo" source is not available ([ISSUE-012](KNOWN_ISSUES.md)) | 2026-11-02 |
| WIDGET-2 | Upload a new photo into a widget | `PLANNED` | Blocked on MEDIA-1: no upload pipeline, Cloudinary SDK or preset exists, so the Add Widgets dialog offers the gallery as its only photo source | 2026-11-02 |
| NAV-1 | Site navigation bar | `VERIFIED` | Bow brand, four destinations (Home, Gallery, Collections, Photo Booth), active pill with a tiny heart, `framer-motion` transitions, desktop bar from `lg`, mobile bottom nav with safe-area padding ([D-022](DECISIONS.md), [D-023](DECISIONS.md)); Home and Gallery have destinations, Collections and Photo Booth are marked unavailable, Add button is dynamic: on Home it reads "+ Add Widgets" and opens the widget dialog (WIDGET-1); on Gallery and the unavailable pages it keeps its old disabled label; no Widgets in navigation | 2026-11-02 |

## Current implementation status

The only user-facing feature is the **homepage** (`HOME-1`…`HOME-6`, `WIDGET-1`, `NAV-1`). Everything else is still foundation.

What exists today:

- A Next.js 16.4.3 + TypeScript application scaffold with App Router.
- The Romantic Scrapbook homepage: hero carousel, the customizable widget desktop, photo gallery and the "Our Love Story" section, built from the supplied photos.
- A widget API (`/api/widgets`, `/api/widgets/[id]`) that stores the shared arrangement in PostgreSQL through Prisma.
- Basic project tooling (Tailwind CSS, ESLint) and zero-dependency Node tests for the ordering rules.
- A design-system foundation (colour, theme, typography tokens).
- A Prisma 7.10.1 data model — four global models, one applied migration, no data access code ([D-013](DECISIONS.md)).
- This documentation system.

What does **not** exist: no authentication (deliberately — [D-013](DECISIONS.md)), no photo upload or Cloudinary integration, no folder or Photo Booth screens, and no PWA configuration (manifest, icons, installation flow, service worker). Offline support, push notifications and background sync are not confirmed features and are not implemented. The gallery and the photos a widget shows still come from the local manifest ([D-015](DECISIONS.md)); only the widget arrangement itself is database-backed.

The photo features below are recorded as `PLANNED` because their data model exists and the product direction is agreed; none of them is usable.

## How to update this document

1. Add the feature as `PLANNED` when its scope is agreed.
2. Move it to `IN_PROGRESS` when implementation starts.
3. Move it to `IMPLEMENTED` when the code is complete.
4. Move it to `VERIFIED` only after checking the behaviour, and record what was checked.
5. Note significant scope changes in [DECISIONS.md](DECISIONS.md) and completed verified work in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md).
6. Keep each feature described in one or two lines; requirements belong in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).
