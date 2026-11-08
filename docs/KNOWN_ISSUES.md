# Known Issues

Defects, limitations and rough edges in Mimori. This document records problems that are actually known — it is not a backlog of wishes.

## Current state

Implemented surfaces are the design-system foundation ([D-007](DECISIONS.md), [D-008](DECISIONS.md)), the Romantic Scrapbook homepage ([D-014](DECISIONS.md)) and the gallery page ([D-027](DECISIONS.md)). Mimori is **light mode only** since [D-028](DECISIONS.md): the dark theme, its tokens and its `prefers-color-scheme` override were removed, so anything below that is described against dark surfaces is historical. The contrast issues below follow from the fixed brand HEX values and were calculated from the shipped tokens; the homepage and gallery issues were found while building and checking them on 2026-11-02.

Any issue documented below must have been actually observed. Do not speculate.

## Open issues

### ISSUE-001 — Muted text is unreadable on the brand background

- Severity: medium
- Area: design tokens / accessibility
- Status: open
- Affected pairing: `--muted-foreground` (`#6E5862`) on `--background` (`#FF69B4`) = **2.45:1** (WCAG AA for body text requires 4.5:1)
- Expected: muted secondary text readable wherever it is used.
- Actual: the Hot Pink canvas ([D-010](DECISIONS.md)) is too light for a muted tone; the same token on `--surface` measures 6.20:1, which is fine.
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

### ISSUE-004 — Dark-theme text was unreadable on the shared Hot Pink background

- Severity: high
- Area: design tokens / accessibility
- Status: fixed — the dark theme was removed ([D-028](DECISIONS.md))
- Affected pairings on `--background` (`#FF69B4`) in the old dark theme: `--foreground` (`#F7EDF1`) = **2.31:1**; `--heading` (`#FFF8FA`) = **2.53:1**; `--muted-foreground` (`#C9B3BC`) = **1.34:1**; status text colours 1.44:1–1.85:1
- Expected: body and heading text readable on the page background.
- Actual: after [D-010](DECISIONS.md) made the background Hot Pink in both themes, the dark theme's near-white text tokens sat on a light canvas (16.02:1 before the change, against `#1B1216`).
- Resolution: Mimori is now light mode only. The `@media (prefers-color-scheme: dark)` block, every dark token and the `color-scheme: dark` declaration were deleted, so the OS preference cannot produce those pairings any more. The light-theme values are the only ones that exist; their own limits are [ISSUE-005](KNOWN_ISSUES.md).

### ISSUE-005 — Body text sits just below AA on the background, and white on it is well below

- Severity: low
- Area: design tokens / accessibility
- Status: open
- Affected pairings on `--background` (`#FF69B4`): `--foreground` and `--heading` (`#49343D`) = **4.31:1** (AA normal text needs 4.5:1); status text colours 2.44:1–3.27:1; white `#FFFFFF` = **2.65:1**
- Expected: body text meets AA on the canvas.
- Actual: previously 4.83:1 against `#E88EAD`; the lighter Hot Pink reduces it to 4.31:1 — AA-large only. Status colours used as text directly on the canvas (rather than on their `-surface` tokens) fall well below AA.
- Workaround: render body copy inside `--surface` (10.89:1); use status text only on its matching `-surface` background, where every pair is ≥ 5.66:1.
- Possible fix (needs approval): darken the text tokens slightly, which changes the brand's text colour and therefore needs a decision.
- Update 2026-11-02: the gallery page's introduction is pure white on Hot Pink by explicit request, which measures **2.65:1** — below AA even for the large heading (3:1) and well below it for the 12px line. It is left as asked rather than silently recoloured; a soft text shadow or a deeper introduction band would be the fix if readability matters more than the exact white.
- Update 2026-11-08: the homepage's **Our Love Story** heading is also pure white on Hot Pink, at the same **2.65:1**, by explicit request, with a pale pink glint travelling across the letters ([D-044](DECISIONS.md), [D-046](DECISIONS.md)). The glint sits on the same white base, so it neither helps nor hurts the contrast; the heading is 36–60px decorative script, and the same shadow-or-band fixes apply.

### ISSUE-006 — Homepage captions and alt text were placeholder copy

- Severity: low
- Area: ui / content
- Status: closed — the bundled manifest was removed ([D-033](DECISIONS.md))
- Affected: the former `lib/photos.ts` manifest — every photo shared `alt: "A photo of us"`, and captions were short generic phrases (`us, always`, `this day`, …) rather than dates or descriptions.
- Expected: alt text that describes each photo, and captions that mean something to the couple.
- Actual: the photos were supplied without dates or descriptions, so the labels were decorative placeholders written for the layout.
- Resolution: the manifest no longer exists, so no photo carries a borrowed caption. A gallery photo's title is its own `Photo.caption` (empty until someone writes one, [ISSUE-018](KNOWN_ISSUES.md)), and its alt text falls back to the uploaded filename.
- Workaround: not needed.

### ISSUE-007 — HEIC originals still ship from `public/`

- Severity: low
- Area: assets
- Status: open
- Affected: `public/couple-images/*.HEIC` (7 files, ~12 MB).
- Expected: only browser-decodable assets inside `public/`.
- Actual: the originals were kept alongside their JPEG derivatives ([D-016](DECISIONS.md)); browsers cannot render HEIC, and nothing references the files, so they are dead weight that is still served if requested directly.
- Update 2026-11-03: the application no longer references **anything** in `public/couple-images` — the gallery, hero, collections and widgets all read `Photo` rows ([D-033](DECISIONS.md)) — so the whole folder, HEIC originals included, is now unreferenced static weight. It was left in place rather than deleted, because the files are the couple's originals.
- Workaround: leave them, or move them outside `public/` once they are backed up elsewhere.

### ISSUE-008 — The same photo can appear in the hero and the gallery

- Severity: low
- Area: ui
- Status: closed — the hero no longer borrows photos ([D-033](DECISIONS.md))
- Affected: `/` — hero carousel and gallery both drew from the same eight bundled photos.
- Expected: two sections that do not obviously repeat the same images.
- Actual: both sections randomised independently, so duplicates across sections were normal; with only eight photos the overlap was easy to notice.
- Resolution: the hero has eight fixed slots that only show a photo assigned from the gallery viewer (HOME-7). Nothing is drawn at random from the gallery, and a slot left empty is a colourful square, so a photo appears twice only if someone deliberately fills a slot with a photo that is also in the gallery.

### ISSUE-009 — The carousel border and its glow share the page's pink family

- Severity: low
- Area: ui
- Status: fixed — the frame now carries a static pure white edge
- Affected: `/` — the running border around the hero carousel container.
- Expected: a frame that separates clearly from the page.
- Actual: the running gradient is built only from the page's own Hot Pink (`#FF69B4`), so on the Hot Pink canvas the border itself did not separate from the page ([D-010](DECISIONS.md)). A static pure white edge (`#FFFFFF`) on the frame now provides that separation, with the running gradient reading against it instead of against the canvas ([D-020](DECISIONS.md)). The soft white halo (`rgba(255, 255, 255, 0.42)`) remains deliberately subtle.
- Workaround: not needed.
- Note: verified in the built stylesheet only; no browser or screenshot verification was performed for this change.

### ISSUE-010 — One navigation destination still has nothing behind it

- Severity: medium
- Area: ui
- Status: fixed — all four destinations open a page
- Affected: `components/nav/site-nav.tsx` — Photo Booth, plus the New Photo Booth label that page would show.
- Expected: every navigation destination opens a working page, and each page's primary action starts its creation flow.
- Actual: Photo Booth renders as an `aria-disabled` entry with a "coming soon" title, and the action button keeps its final pink styling but stays `disabled` with an explanatory title ([D-022](DECISIONS.md)). Nothing pretends to work.
- Update 2026-11-02: the homepage's primary action now works — "+ Add Widgets" opens the widget dialog (WIDGET-1) — and Gallery moved to its own page at `/gallery` ([D-027](DECISIONS.md)).
- Update 2026-11-03: **Collections** is now a real destination. `/collections` and `/collections/[id]` exist (PHOTO-2), navigation highlights them on their sub-pages, and "+ Add Collection" opens the collection dialog ([D-029](DECISIONS.md)). Only Photo Booth remained unavailable.
- Resolution 2026-11-03: **Photo Booth** now has `/photo-booth`, so the destination is a normal link and the primary action reads "+ New Photo Booth" and links back to the setup anchor (PHOTO-5, [D-034](DECISIONS.md)). Setup and camera capture are live (PHOTO-6); the editor, saving and download are not built yet (PHOTO-4 is `IN_PROGRESS`), so a reviewed session stops there.
- Workaround: not needed; all four destinations are usable.

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
- Status: fixed — the widget picker reads the gallery ([D-033](DECISIONS.md))
- Affected: the Add Widgets dialog's photo step (`components/widgets/add-widget-dialog.tsx`).
- Expected: a photo uploaded to the Gallery can be chosen for a widget, without duplicating the upload.
- Actual (before the fix): the widget dialog validated photo ids against `lib/photos.ts` ([D-025](DECISIONS.md)) and listed only the bundled photos, so a photo uploaded to `/gallery` could not be used by a widget.
- Resolution: `/api/gallery` now serves the `Photo` rows and the dialog lists them after its colourful empty slots. A photo uploaded on `/gallery` becomes selectable immediately — the upload dialog refreshes the shared list — and no second copy is created. Uploading from inside the widget dialog is still not offered (WIDGET-2).
- Workaround: not needed; upload in the Gallery first.

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

### ISSUE-015 — A collection can only hold manifest photos

- Severity: medium
- Area: data / media
- Status: fixed — collections store gallery `Photo` ids ([D-033](DECISIONS.md))
- Affected: `/collections`, `/collections/[id]`, `/api/collections*`.
- Expected: a collection can hold any gallery photo, including newly uploaded ones, from one image record.
- Actual (before the fix): membership stored a manifest id and the API validated against `lib/photos.ts` ([D-029](DECISIONS.md)), so a freshly uploaded photo could not be filed even though it appeared in the gallery.
- Resolution: `CollectionPhoto.photoId` now holds the id of a `Photo` row. The API validates ids against the table, reads filter membership through the same list, and the pickers offer those photos after their empty slots. Adding a photo still never copies, uploads or deletes it; removing it only deletes the membership row.
- Remaining limitation: the column still has **no foreign key** to `Photo`, so a row can outlive its photo. Such an id is filtered out on read (the photo simply disappears from the collection) rather than rendered broken; promoting it to a real foreign key is a migration for a later change.
- Workaround: not needed.

### ISSUE-016 — "Recently added" is manifest order, not an upload time

- Severity: low
- Area: ui / data
- Status: fixed — the strip is ordered by `Photo.createdAt` ([D-033](DECISIONS.md))
- Affected: the Recently added strip on `/collections`.
- Expected: the newest photos across the gallery, in the order they were added.
- Actual (before the fix): the manifest stored no dates, so the strip reversed the array and treated later entries as newer.
- Resolution: Recently added reads the gallery list from `/api/gallery`, which orders `Photo` rows by `createdAt` descending. With no photos it shows colourful empty slots and a one-line hint instead of borrowed pictures. Verified with two uploads: the second upload appeared first.
- Workaround: not needed.

### ISSUE-017 — The upload endpoint has no authentication or rate limiting

- Severity: medium
- Area: auth / media
- Status: open — accepted while Mimori has no accounts
- Affected: `POST /api/photos/upload`.
- Expected: only the couple can add photos, and nobody can exhaust the Cloudinary quota.
- Actual: Mimori has no authentication or authorization model ([D-013](DECISIONS.md)), so the handler cannot check a user; anyone who can reach the application can upload. It limits the damage structurally — one image per request, JPEG/PNG/WebP/AVIF only, 10 MB maximum, verified from the file's own bytes, and one Cloudinary folder — but it has no rate limit, no per-day quota and no Origin check ([D-030](DECISIONS.md)). Deployment exposure is the only control, as it is for every other write route.
- Workaround: do not deploy Mimori publicly without access control ([SECURITY.md](SECURITY.md)); configure Cloudinary upload limits on the account if needed.

### ISSUE-018 — Uploaded photos have no title

- Severity: low
- Area: ui / data
- Status: open — accepted for now
- Affected: `/gallery` polaroid frames and the photo viewer.
- Expected: a title for a photo that came from the device.
- Actual: an upload fills only the file metadata, so `Photo.caption` stays `NULL`. The gallery shows the polaroid with an empty caption area and the viewer shows no title line — deliberately, rather than printing a filename or `undefined` as a title ([D-027](DECISIONS.md), [D-030](DECISIONS.md)). The frame's accessible label falls back to the original filename, or "A photo of us" when there is none.
- Workaround: none in the UI yet; a caption could be written directly to `Photo.caption`, which the gallery would then show.

### ISSUE-019 — A filled carousel slot cannot be emptied from the UI

- Severity: low
- Area: ui / data
- Status: open — accepted for now
- Affected: HeroCarousel slots filled from the gallery viewer ([D-032](DECISIONS.md), [D-033](DECISIONS.md)).
- Expected: a way to put a slot back to its empty colourful square.
- Actual: a filled slot can only be changed by filling it again with another gallery photo and title. There is no **clear slot** action, so a slot cannot return to its empty state from the UI. The stored slot keeps only the photo id and title (never a URL), so the carousel resolves the picture from the `Photo` row on every read — if that photo is deleted outside the app, the slot reads as empty instead of pointing at a broken image.
- Workaround: fill the slot again with a different photo; or delete the single `Widget` row with `type = 'hero-carousel'` to reset all eight slots to empty.

### ISSUE-020 — "+ New Photo Booth" does not clear the setup choices

- Severity: low
- Area: ui
- Status: fixed 2026-11-04 — every new booth opens on the defaults
- Affected: `components/nav/site-nav.tsx` on `/photo-booth`, and the choices in `components/photo-booth/photo-booth.tsx`.
- Expected: starting a new booth resets photo count, shape and border to their defaults.
- Actual (before the fix): the action was a link to `/photo-booth#photo-booth-setup`. From another page it opened the setup screen with its defaults; while already on the page it scrolled back to the setup and kept the current selections, which live in component state and are never persisted ([D-034](DECISIONS.md)).
- Fix: the setup is now a sheet opened by **+ New Photobooth** on `/photo-booth` or by the navbar action, and opening it always starts from the documented defaults (4 photos, vertical strip, Lovely Hearts) the way the Add Widgets dialog opens on a blank draft ([D-039](DECISIONS.md)). The navbar link's `#photo-booth-setup` anchor opens the sheet whether it is clicked on the page or entered directly.
- Notes: **Back to setup** from the review and **Exit** from the camera reopen the sheet with the choices that booth was started with, because those are an edit of the current attempt rather than a new one.

### ISSUE-021 — An unsaved photobooth session exists only in the tab

- Severity: low
- Area: ui / data
- Status: fixed 2026-11-04 — a saved booth reopens and edits; an unsaved one is still tab-only
- Affected: `/photo-booth` camera, review and editor steps before **Save to Gallery** ([D-035](DECISIONS.md)–[D-038](DECISIONS.md)).
- Expected: a finished, decorated booth can be kept and edited again later.
- Actual: **Save to Gallery** uploads the captures and the print and writes a `PhotoboothSession`, and **Our Saved Photobooths** on `/photo-booth` now lists every saved session and reopens it in the editor with its original photographs and settings, updating that same session on save ([PHOTO-9](FEATURES.md)). Before saving, captures are still JPEG Blobs with object URLs in `PhotoBooth`'s state, so a reload, closing the tab or **Back to setup** discards them; **Back to saved booths** leaves an opened session exactly as it was stored.
- Workaround: save before leaving the tab. Navigating between the camera, review and editor keeps the session, and a reopened booth can be closed without writing anything.

### ISSUE-022 — The photobooth camera has only run against a virtual device

- Severity: medium
- Area: ui / browser compatibility
- Status: open — needs real-device testing
- Environment: Chromium in the development browser with a virtual camera; no phone or tablet was available.
- Affected: `components/photo-booth/camera-step.tsx`, `lib/photo-booth/camera.ts`.
- Expected: front/rear switching, portrait framing, countdown and permission prompts behave correctly on iOS Safari and Android Chrome, over HTTPS and on localhost.
- Actual: the capture path uses plain `getUserMedia` + canvas (no `ImageCapture`), stops tracks on switch and unmount, limits frames to 1080px wide and shows friendly copy for the standard `getUserMedia` error names, but none of that has been run on real camera hardware. Torch is only offered when the track advertises it and may still be refused. The camera screen was additionally not checked at mobile width in this session, because the shared browser stopped responding once the camera started in a 390px tab and could not be recovered for further automation.
- Notes / workaround: open `/photo-booth` on a phone (or a desktop with a real camera) over HTTPS/localhost, take a session and retake one photo, and check the error copy with camera permission denied. In this checkout starting the camera still wedges the shared development browser — it did so again on 2026-11-04 — so the setup-to-camera handover was not re-checked after the setup moved into a sheet; the camera step itself was last driven against the virtual device in Phase 2.

### ISSUE-023 — The finished photobooth print cannot be downloaded or saved

- Severity: medium
- Area: ui / data
- Status: fixed 2026-11-03 — **Save to Gallery** writes the session, and a **Download print** link saves the JPEG
- Affected: the editor's finished print ([D-036](DECISIONS.md), [D-037](DECISIONS.md)).
- Expected: the exact composition can leave the app, as a file or as a Gallery photo.
- Actual (before the fix): the canvas renderer produced a real `image/jpeg` blob at 1600px wide and the editor displayed it, but it was only an in-memory object URL with no download control and no Gallery/Cloudinary write.
- Fix: `lib/photo-booth/save.ts` uploads the captures as `PHOTO_BOOTH` photos and the rendered JPEG as a `GALLERY` photo, then saves a `PhotoboothSession`; the finished panel shows real progress, keeps the work for a retry and offers **Open Gallery** and **Download print** once the session is confirmed ([PHOTO-8](FEATURES.md)).
- Notes: the download renders the composition on screen through the canvas renderer and saves it as `mimori-our-little-moments.jpg`, so it works for a reopened booth and for an unsaved change; it needs every saved photo to load, and reports an error instead of saving a blank print.

### ISSUE-024 — Abandoning a failed photobooth save can leave unreferenced uploads

- Severity: low
- Area: data
- Status: partly fixed 2026-11-04 — an edit cleans up the page it replaces; an abandoned new-session save can still leave uploads
- Affected: **Save to Gallery** and **Update saved print** in the photobooth editor ([D-037](DECISIONS.md), [D-038](DECISIONS.md)).
- Steps to reproduce:
  1. Finish a photobooth print and press **Save to Gallery** with the network or database unavailable after the uploads succeed.
  2. Press **Back to editing**, change something, then save again, or leave the page.
- Expected: a failed save leaves nothing behind.
- Actual: the captures and print that were already uploaded are kept so **Try saving again** cannot upload them twice. If the new session is abandoned instead, those `PHOTO_BOOTH` rows stay in Cloudinary unreferenced (and invisible, since every gallery query filters `kind = GALLERY`), and a print uploaded for settings the user then changed remains as an ordinary Gallery photo with no session. Editing a saved booth is better: after the update commits, the replaced print row is deleted with its Cloudinary asset once nothing else references it, so repeated edits do not pile up pages.
- Notes / workaround: for an abandoned new session there is no delete endpoint and no cleanup job, so removal needs the Cloudinary console or a future scheduled sweep. The alternative — deleting on failure — would throw away work the retry depends on.

### ISSUE-025 — The reopened-booth UI has not been checked at mobile width or with six photos

- Severity: low
- Area: ui
- Status: open — needs a browser re-check
- Environment: Chromium at 1280px; the shared browser stopped responding when the camera was started for another session and could not be reattached afterwards.
- Affected: `components/photo-booth/saved-sessions.tsx`, `photo-booth.tsx`, `editor-step.tsx`, `save-panel.tsx`, `save-bar.tsx`.
- Expected: the saved-booth cards, the reopened editor, the update panel and **Download print** behave at 390px and in a six-photo print, with no horizontal overflow, reachable controls and comfortable touch targets.
- Actual: the desktop saved-booth flow was exercised end to end (reopen, restore, edit, update, download, reload — [PHOTO-9](FEATURES.md)). The card grid, the wrapped editor tab row and the reworded save panel were not viewed at mobile width, and the six-photo editor is still covered by the geometry and unit tests rather than the UI, as in Phase 3.
- Notes / workaround: the layout reuses structures already checked at 390px in Phases 1–4 (a single column below `lg`, a wrapped tab pill row, a `max-w` preview and wrapping button rows). Re-check on a phone or in a fresh browser session.

### ISSUE-026 — A change made in another tab is not pushed into the open tab's stores

- Severity: low
- Area: ui
- Status: open — accepted limitation
- Affected: the shared client stores in `app/layout.tsx` — `GalleryPhotosProvider`, `HeroSlotsProvider`, `WidgetsProvider`, `CollectionsProvider` ([D-040](DECISIONS.md)).
- Steps to reproduce:
  1. Open Mimori in two tabs.
  2. Replace a carousel photo, rename a gallery title or edit a collection in one tab.
  3. Look at the other tab.
- Expected: the first tab's change appears in the second tab.
- Actual: the second tab keeps what it loaded (or last saved itself) until it is reloaded or the affected feature's own action re-fetches. This is deliberate: the request ruled out WebSockets and polling, and these stores carry the current session's own writes, not a live feed.
- Notes / workaround: reload the other tab. Nothing is lost — the database holds the change and every page reads it on load, so a reload always shows the newest state. A future multi-tab sync would need a broadcast channel or a real-time channel, which is a new decision.

### ISSUE-027 — A deleted gallery photo cannot be restored, and its file can outlive its row

- Severity: low
- Area: data
- Status: accepted limitation
- Affected: **Delete image** in the gallery viewer ([MEDIA-2](FEATURES.md), [D-041](DECISIONS.md)).
- Steps to reproduce:
  1. Open a photo in `/gallery` and press **Delete image**, then **Delete**.
  2. Optionally repeat with Cloudinary unreachable.
- Expected: a confirmed deletion is final; a failed one is reported.
- Actual: the row, its collection entries, its widget and carousel references and its Cloudinary asset all go at once, so there is no trash, undo or restore, and URL-less cleanup needs a database or Cloudinary console. If the row is deleted and `image/destroy` then fails, the photo is gone from the Gallery and the page shows “The photo was removed from your gallery, but its file could not be deleted from storage.” — the asset stays on the account with nothing pointing at it.
- Notes / workaround: identical photos can be re-uploaded, which creates a new `Photo` row (widgets, collections and slots must be pointed at it again). A saved booth's print is refused by the API (409) rather than deleted, so sessions are never cascaded away; deleting such a print would need a dedicated flow that removes the session deliberately. Deleting is only offered on the gallery page's viewer, not on collection pages.

### ISSUE-028 — The page transition has no exit half, and the View Transitions API aborts here

- Severity: low
- Area: ui
- Status: accepted limitation
- Affected: `components/scrapbook/page-transition.tsx` ([UI-2](FEATURES.md), [D-045](DECISIONS.md)).
- Steps to reproduce:
  1. Move between Home, Gallery, Collections and Photo Booth and watch the leaving page.
  2. Alternatively, wrap a route in React's `<ViewTransition>` and navigate.
- Expected: the old page could also turn away, and a snapshot-based transition could animate both halves.
- Actual: only the arriving page animates. The leaving page has already been hidden by the framework when the new one renders, so there is nothing left to animate out; the effect is a settle-in, not a full page turn. React's `<ViewTransition>` was tried first and cannot be used in this setup: Next keeps the previous route mounted (hidden) and React applies the same auto-generated `view-transition-name` to both, so Chrome rejects the transition with `InvalidStateError: Transition was aborted because of invalid state`. Giving each route its own name did not help either — only the hidden outgoing page ends up named, and the transition still aborts.
- Notes / workaround: the current effect is deliberately cheap and safe — no remounting, no state reset, instant under reduced motion — so the missing exit half costs little. If a true paper turn is wanted later, it needs a framework-level fix (a Next version where the previous route is unmounted, or a supported view-transition integration) rather than more CSS.

### ISSUE-029 — The photo book's curl is canvas-continuous, but its frame rate is unmeasured, real touch feel is unverified, and its pages are small on a phone

- Severity: low
- Area: ui
- Status: accepted limitation
- Affected: `components/collections/photo-book.tsx`, `components/collections/page-curl-canvas.tsx` ([PHOTO-10](FEATURES.md), [D-048](DECISIONS.md)).
- Steps to reproduce:
  1. Open a collection with several photos and drag a page slowly, or use the arrows.
  2. Repeat at a phone width (390px).
- Expected: a continuous paper curl at every size, with full-size photos on a phone.
- Actual: the turning sheet is a single canvas curl (~70 ribbons, no strip joints), clipped to the book's rectangle so a lifted page never overhangs the cover. The curl bends only along the horizontal axis with a small skew toward the grab point — a corner grab does not truly curl in two dimensions. At 390px the open book is 358px wide, which leaves each page about 179px and each print about 150px — legible as a spread, not as a photo. A photograph is never stretched or cropped to fill the space.
- Notes / workaround: tapping a page opens the existing viewer at full size, and the arrow buttons or keyboard work at every width. Verified so far in the desktop browser only: forward/backward button turns, slow-drag follow, short-drag return, flick-to-complete, and a mid-drag reversal, all via sampled pixels; after the seam fix the surface was measured again at eight forward and four backward drag positions, with no column-to-column step above 2.7 luminance in the sheet's paper band apart from the fold's own silhouette at 0.6 progress ([D-049](DECISIONS.md)). Not verified: frame cadence under load, real finger feel on a device, and 390px layout since the change; the settle after a release could not be observed at all, because this automation window throttles `requestAnimationFrame` to about one frame per second, so only held drags were sampled. A single-page (portrait) mode on phones would be a new decision.

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

## ISSUE-029 — PWA installation and offline behaviour are verified only in a desktop production build

- Area: pwa
- Status: open
- Severity: low
- Environment: production build served locally (`next start`), Chromium-based desktop browser; no physical iOS, Android, Samsung Internet, ChromeOS or Windows device was available.
- Steps to reproduce:
  1. Open the production site on iOS Safari and tap Share.
  2. Choose Add to Home Screen; then open the installed app while offline.
- Expected: installed, full-screen launch; the offline page for any navigation.
- Actual: not tested on these platforms; the manifest, icons, service worker registration and the API no-store exclusion were checked with HTTP requests against the production server.
- Notes / workaround: install through the browser menu on desktop or the Share menu on iOS. Offline use shows the offline page only; uploads and data need a connection. The service worker updates on the next visit.
- Related: [D-054](DECISIONS.md)

## Process

- Log an issue when it is found, with reproduction steps.
- When fixed, do not delete it: mark it fixed, note the fix and the date.
- Record the completed fix in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md).
- If an issue blocks planned work, mark the affected feature `BLOCKED` in [FEATURES.md](FEATURES.md).
