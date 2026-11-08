# Push Notifications

Mimori's native notifications. One device changes something; every *other* subscribed device gets a short operating-system notification. There is no notification centre, bell, history or settings screen — the only visible surface is the native notification ([D-061](DECISIONS.md)).

## What exists

| Piece | Where |
| ----- | ----- |
| Event names, messages, payload and subscription validation (pure, shared) | `lib/push/messages.ts` |
| Subscription storage, VAPID setup, delivery and pruning (server only) | `lib/push/server.ts` |
| Permission, subscription and unsubscribe from the browser | `lib/push/client.ts` |
| Keeps a granted device registered on load, never prompts | `components/pwa/push-registrar.tsx` |
| Asks permission from the Add Memory click | `components/gallery/gallery-upload-provider.tsx` |
| Receives a push in the background, displays it, handles a click | `public/sw.js` |
| Subscription endpoints | `app/api/push/subscribe` (POST, DELETE) |
| Table | `PushSubscription` (`prisma/schema.prisma`, migration `20261109120000_add_push_subscriptions`) |

The service worker is the one already registered by `components/pwa/service-worker-register.tsx` (`/sw.js`, scope `/`, production builds only). Its caching behaviour is unchanged; the push handlers only display a notification and pick where a click goes.

## Messages

| Action | Notification | Opens |
| ------ | ------------ | ----- |
| Upload photo | A new photo uploaded 📸 | `/gallery` |
| Create collection | A new collection created 🌷 | `/collections` |
| Delete photo | A photo was deleted | `/gallery` |
| Delete collection | A collection was deleted | `/collections` |
| Save photobooth | A new photobooth memory saved 💗 | `/photo-booth` |
| Add widget | A new widget added 🎀 | `/` |
| Delete widget | A widget was removed | `/` |

Titles are always **Mimori**. A notification is sent only after the database operation has succeeded, once per successful action; edits (renaming a photo, updating a collection or booth) and failed or cancelled operations are silent. Photo Booth *uploads* never announce themselves — the saved session is what produces the single notification. The app in front of the user keeps its existing toast; the device that performed the action is excluded from delivery.

## How a device is identified

Mimori has no accounts, so a device is its own push subscription. When the browser subscribes, `lib/push/client.ts` stores the subscription with `POST /api/push/subscribe` and then writes the subscription's endpoint into a `mimori-push-device` cookie. Every existing request from that browser carries the cookie, and the route that completed the action passes the request to `notifyOtherDevices()`, which excludes exactly that endpoint. The cookie is the device's own public endpoint; a missing or malformed cookie simply means nobody is excluded. Nothing else from the client is accepted — a request cannot choose what a notification says.

## Environment variables

| Variable | Visible to | Purpose |
| -------- | ---------- | ------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser | `pushManager.subscribe()` application server key |
| `VAPID_PRIVATE_KEY` | Server only | Signs the encrypted push; never shipped to the browser |
| `VAPID_SUBJECT` | Server only | A contact URI for the push service, e.g. `mailto:you@example.com` |

Placeholders live in [`.env.example`](../.env.example). Without all three, the app runs exactly as before and simply sends no notifications.

### Generate a key pair

Use the installed `web-push` package, once for the whole app:

```bash
node -e 'console.log(require("web-push").generateVAPIDKeys())'
```

It prints a `publicKey` and a `privateKey`.

- Keep one pair. Using a different pair invalidates existing subscriptions, because a subscription is encrypted to the key it was created with (devices then re-subscribe on their next visit after re-granting permission).
- The public key is safe in the browser; the private key is a secret.

### Local

Add the three values to the git-ignored `.env` (never commit them), then restart the dev server:

```dotenv
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<publicKey>"
VAPID_PRIVATE_KEY="<privateKey>"
VAPID_SUBJECT="mailto:you@example.com"
```

Notes for local testing:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is compiled into the client bundle, so a change needs a server restart (and a fresh `npm run build` for `next start`).
- The service worker registers only in a production build, so push needs `npm run build && npm start` (or a deployed environment), not `npm run dev`.
- Browsers require a secure context: `http://localhost` counts, a LAN IP address does not.
- iOS delivers Web Push only to Mimori installed on the Home Screen, on iOS/iPadOS 16.4 or later.

### Vercel

1. Project → **Settings → Environment Variables**.
2. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` for the environments you deploy (Production, and Preview if you test there). All three are plain variables — none needs to be marked sensitive for the app to work, but the private key should be treated as a secret.
3. Redeploy so the new variables are available; `NEXT_PUBLIC_*` values are baked in at build time, so a variable added after a build requires a new deployment.
4. Confirm the deployment's URL is served over HTTPS; push and the service worker both require it.

## Database

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

The migration is additive: it only creates `PushSubscription` and its unique index on `endpoint`. `prisma db push` and `prisma migrate reset` are never used. Re-subscribing upserts the row for the same endpoint, so a browser profile or installed app keeps exactly one row; a device that unsubscribes is deleted through `DELETE /api/push/subscribe`, and a device the push service reports as gone (`404`/`410`) is deleted after a delivery attempt. Rows whose stored `expirationTime` has passed are pruned before each send.

## Testing with two devices

1. Deploy or run a production build with the three VAPID variables set (see above).
2. On **device A**, open Mimori, then press **+ Add Memory** and allow notifications. This is the only place permission is requested; the upload dialog opens either way, and a denied or unsupported browser changes nothing else.
3. Check `_prisma_migrations` / Prisma Studio: `PushSubscription` now holds one row for device A.
4. On **device B** — another browser profile, phone or installed PWA — open Mimori and allow notifications the same way. A second row appears; the first row is not replaced.
5. On **device A**, upload a photo. Device A shows its usual toast and **no** notification; device B gets **Mimori — A new photo uploaded 📸**.
6. Repeat for a collection, a saved photobooth and a widget. Each action produces one notification on the other device.
7. Close Mimori on device B (or leave the tab in the background) and repeat step 5: the notification still arrives, because the service worker handles it.
8. Tap the notification on device B: Mimori opens (or an existing window is focused) on `/gallery` (or `/collections`, `/photo-booth`, `/` for the matching action).
9. On device B, revoke notifications in the browser's site settings and reload Mimori; the row is removed on that load.

## Limits to keep in mind

- Notification content is fixed by the server. A push payload has a title, one short line, a tag and a same-origin path; the service worker accepts no other destination and falls back to `/` for anything that is not a path on this origin.
- Permission is requested once, from a real interaction, and only while `Notification.permission === "default"`. A denial is never asked again; the only recovery is the browser's own site settings.
- Delivery is best effort. A failed send is logged without the endpoint and never turns a successful upload, save or deletion into an error; other devices still receive the notification.
- Notifications are sent *after* the response (`after()`), so they never delay the action the user performed.
