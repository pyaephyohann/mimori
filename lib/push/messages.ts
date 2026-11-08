/**
 * What Mimori notifies another device about, and the rules around it.
 *
 * Pure and dependency-free, so the server (to build a payload), the API (to
 * validate a subscription), the browser and the test runner all read the same
 * definitions. Nothing here is client-supplied text: an action is named by a
 * `PushEventName` on the server, and the message is looked up — a client can
 * only tell the server which endpoint performed the action, and that value is
 * used solely to leave that one device out of delivery.
 */

/**
 * The handful of successful actions that notify the other devices. Every name
 * here corresponds to one completed database operation, never to a request that
 * was merely attempted.
 */
export type PushEventName =
  | "photo-uploaded"
  | "photo-deleted"
  | "collection-created"
  | "collection-deleted"
  | "booth-saved"
  | "widget-added"
  | "widget-removed";

export type PushMessage = {
  /** Always Mimori: the notification is the app speaking, not a person. */
  title: string;
  /** One short line; no description, no sender, no extra copy. */
  body: string;
  /** A same-origin path the click opens. */
  url: string;
  /** Replaces a previous notification of the same kind instead of stacking. */
  tag: string;
};

/** The app's name in every notification. */
export const PUSH_TITLE = "Mimori";

/** The bow from the home screen, the same asset the manifest installs. */
export const PUSH_ICON = "/icons/icon-192.png";

const MESSAGES: Record<PushEventName, Omit<PushMessage, "title">> = {
  "photo-uploaded": {
    body: "A new photo uploaded 📸",
    url: "/gallery",
    tag: "mimori-photo-uploaded",
  },
  "photo-deleted": {
    body: "A photo was deleted",
    url: "/gallery",
    tag: "mimori-photo-deleted",
  },
  "collection-created": {
    body: "A new collection created 🌷",
    url: "/collections",
    tag: "mimori-collection-created",
  },
  "collection-deleted": {
    body: "A collection was deleted",
    url: "/collections",
    tag: "mimori-collection-deleted",
  },
  "booth-saved": {
    body: "A new photobooth memory saved 💗",
    url: "/photo-booth",
    tag: "mimori-booth-saved",
  },
  "widget-added": {
    body: "A new widget added 🎀",
    url: "/",
    tag: "mimori-widget-added",
  },
  "widget-removed": {
    body: "A widget was removed",
    url: "/",
    tag: "mimori-widget-removed",
  },
};

export function pushMessageFor(event: PushEventName): PushMessage {
  return { title: PUSH_TITLE, ...MESSAGES[event] };
}

export function isPushEventName(value: unknown): value is PushEventName {
  return typeof value === "string" && Object.hasOwn(MESSAGES, value);
}

/**
 * A click destination must be a path on this origin. Anything absolute,
 * protocol-relative, backslash-escaped or otherwise surprising is refused, so a
 * payload can never send a device to another site.
 */
export function isSafeNotificationPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) {
    return false;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  // Control characters, backslashes and whitespace have no legitimate place in
  // a path, and some of them are treated as a host by URL parsers.
  if (/[\u0000-\u001f\u007f\\\s]/.test(value)) {
    return false;
  }

  return true;
}

/**
 * The payload shape the service worker accepts. A push that does not parse
 * still shows the app's name, so a corrupt message is never silently dropped.
 */
export function parsePushPayload(raw: unknown): PushMessage | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const body = (raw as { body?: unknown }).body;
  const url = (raw as { url?: unknown }).url;
  const tag = (raw as { tag?: unknown }).tag;

  if (typeof body !== "string" || body.trim() === "") {
    return null;
  }

  return {
    title: PUSH_TITLE,
    body: body.slice(0, 180),
    url: isSafeNotificationPath(url) ? url : "/",
    tag: typeof tag === "string" && tag.length > 0 ? tag.slice(0, 64) : PUSH_TITLE,
  };
}

// ---------------------------------------------------------------------------
// The originating device
// ---------------------------------------------------------------------------

/**
 * The cookie that names this device's push endpoint.
 *
 * A request from the browser carries its own subscription in this cookie, so
 * every existing fetch (upload, delete, save) identifies its device with no new
 * header or body field. It is the device's own public endpoint — the value a
 * push service already hands back — never a secret, and nothing is trusted
 * beyond excluding it from delivery.
 */
export const DEVICE_COOKIE = "mimori-push-device";

/** A push endpoint is always https and is handed back by the browser. */
export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 12 || value.length > 2048) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function readDeviceEndpoint(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() !== DEVICE_COOKIE) {
      continue;
    }

    let value: string;

    try {
      value = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }

    return isPushEndpoint(value) ? value : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// A subscription, as the browser reports it
// ---------------------------------------------------------------------------

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: Date | null;
};

export type ParsedSubscription =
  | { ok: true; value: PushSubscriptionRecord }
  | { ok: false; error: string };

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/**
 * Validates the body of `POST /api/push/subscribe`. Only the four fields a
 * `PushSubscription` exposes are accepted; unknown fields are ignored, so a
 * client cannot smuggle anything into a row.
 */
export function parsePushSubscriptionBody(raw: unknown): ParsedSubscription {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Expected a push subscription." };
  }

  const body = raw as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown } | null;
  };

  if (!isPushEndpoint(body.endpoint)) {
    return { ok: false, error: "That push endpoint is not valid." };
  }

  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;

  if (typeof p256dh !== "string" || p256dh.length < 40 || p256dh.length > 200 || !BASE64URL.test(p256dh)) {
    return { ok: false, error: "That push key is not valid." };
  }

  if (typeof auth !== "string" || auth.length < 12 || auth.length > 100 || !BASE64URL.test(auth)) {
    return { ok: false, error: "That push secret is not valid." };
  }

  let expirationTime: Date | null = null;

  if (body.expirationTime !== null && body.expirationTime !== undefined) {
    if (
      typeof body.expirationTime !== "number" ||
      !Number.isFinite(body.expirationTime) ||
      body.expirationTime <= 0
    ) {
      return { ok: false, error: "That push expiry is not valid." };
    }

    expirationTime = new Date(body.expirationTime);
  }

  return {
    ok: true,
    value: { endpoint: body.endpoint, p256dh, auth, expirationTime },
  };
}
