import { DEVICE_COOKIE, readDeviceEndpoint } from "./messages";

/**
 * Browser-side half of Mimori's notifications.
 *
 * Three jobs, all optional by design: ask once for permission from a real
 * interaction, keep this device's subscription registered, and forget it when
 * the browser refuses. Every function here swallows its own failures — a
 * browser without push, a refused permission or a failing request leaves the
 * app exactly as it was, and never blocks the upload or save that triggered it.
 *
 * The service worker stays the one registered by `ServiceWorkerRegister`
 * (`/sw.js`, scope `/`); this module only ever borrows its registration, and
 * registers nothing itself.
 */

/** Only the public key reaches the browser; the private key stays server-side. */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** How long to wait for a worker that is installing to become active. */
const WORKER_READY_MS = 5_000;

function hasPushApis(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS only delivers Web Push to an app installed on the Home Screen (16.4+).
 * Asking from a Safari tab cannot work, so it is skipped rather than prompted.
 */
function needsInstalledApp(): boolean {
  const userAgent = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

  return ios && !isStandalone();
}

/** `applicationServerKey` must be bytes, not the URL-safe base64 string. */
function toApplicationServerKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

function setDeviceCookie(endpoint: string) {
  document.cookie = `${DEVICE_COOKIE}=${encodeURIComponent(endpoint)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearDeviceCookie() {
  document.cookie = `${DEVICE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** The active worker for `/`, waiting briefly while an update installs. */
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    return null;
  }

  if (registration.active) {
    return registration;
  }

  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), WORKER_READY_MS),
    ),
  ]);

  return ready ?? null;
}

/** Sends this device's subscription to the server and remembers its endpoint. */
async function registerOnServer(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const keys = json.keys;

  if (!endpoint || !keys?.p256dh || !keys.auth) {
    return;
  }

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    }),
  });

  if (response.ok) {
    setDeviceCookie(endpoint);
  }
}

/**
 * Subscribes this device if the browser has already granted permission. Safe to
 * call on every load: an existing subscription is reused and re-sent, which is
 * how a renewed subscription or a fresh database row stays in step.
 */
export async function subscribeThisDevice(): Promise<void> {
  if (!hasPushApis() || needsInstalledApp() || !VAPID_PUBLIC_KEY) {
    return;
  }

  try {
    const registration = await activeRegistration();

    if (!registration) {
      return;
    }

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY),
      }));

    await registerOnServer(subscription);
  } catch {
    // A refused or impossible subscription is not a failure of the app.
  }
}

/** Forgets this device, on the server and in the browser. */
export async function unsubscribeThisDevice(): Promise<void> {
  if (!hasPushApis()) {
    return;
  }

  const remembered = readDeviceEndpoint(document.cookie);

  try {
    const registration = await activeRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint ?? remembered;

    if (endpoint) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    }

    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch {
    // Nothing to recover: the device simply stops receiving notifications.
  } finally {
    clearDeviceCookie();
  }
}

/**
 * Asks for notification permission, once, from a real interaction.
 *
 * Never called on load. A previous denial is left alone — asking again cannot
 * succeed and would be repeated nagging — and being on an unsupported browser
 * or an un-installed iOS browser is a no-op. The caller does not await it, so
 * the action that triggered it proceeds regardless of the answer.
 */
export async function requestNotifications(): Promise<void> {
  if (!hasPushApis() || needsInstalledApp()) {
    return;
  }

  try {
    if (Notification.permission === "granted") {
      await subscribeThisDevice();
      return;
    }

    if (Notification.permission !== "default") {
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      await subscribeThisDevice();
    }
  } catch {
    // Permission is optional; the app behaves exactly as before without it.
  }
}

/**
 * Runs on mount: silently keeps a granted device registered, and removes a
 * device whose permission was revoked outside the app. It never prompts.
 */
export async function syncDevicePushState(): Promise<void> {
  if (!hasPushApis()) {
    return;
  }

  try {
    if (Notification.permission === "granted") {
      await subscribeThisDevice();
      return;
    }

    if (Notification.permission === "denied") {
      await unsubscribeThisDevice();
    }
  } catch {
    // Best effort; the next load tries again.
  }
}
