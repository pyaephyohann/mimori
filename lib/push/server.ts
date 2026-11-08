import { after } from "next/server";
import { sendNotification, setVapidDetails } from "web-push";

import { getPrisma } from "@/lib/db";

import {
  readDeviceEndpoint,
  pushMessageFor,
  type PushEventName,
  type PushSubscriptionRecord,
} from "./messages";

/**
 * Server-only push delivery.
 *
 * One module owns every subscription row and every send, so no route needs to
 * know how a notification is built or encrypted. Two rules hold everywhere in
 * here: delivery never runs before the caller's database operation has
 * succeeded (routes schedule it with `after`, i.e. after the response), and a
 * delivery failure is logged and swallowed, because it must never turn a
 * successful photo, collection, booth or widget into an error.
 *
 * The VAPID private key stays on this side: only the public key is exposed,
 * through `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, for `pushManager.subscribe()`.
 */

/** How long a push service may hold an undelivered notification. */
const TTL_SECONDS = 4 * 60 * 60;

let vapidConfigured: boolean | null = null;

/**
 * `web-push` needs the key pair once per process. A missing configuration is
 * not an error — the app simply has no push delivery until the environment is
 * filled in, exactly like a missing Cloudinary key leaves uploads unavailable.
 */
function configureVapid(): boolean {
  if (vapidConfigured !== null) {
    return vapidConfigured;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    vapidConfigured = false;
    return false;
  }

  try {
    setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  } catch (error) {
    console.error(
      "Push notifications are misconfigured; VAPID details were rejected.",
      error instanceof Error ? error.message : "unknown error",
    );
    vapidConfigured = false;
  }

  return vapidConfigured;
}

export function isPushConfigured(): boolean {
  return configureVapid();
}

/**
 * Stores a device, or refreshes the keys of one that is already stored. The
 * endpoint is unique, so a browser that re-subscribes keeps a single row
 * instead of accumulating devices that no longer exist.
 */
export async function savePushSubscription(
  record: PushSubscriptionRecord,
): Promise<void> {
  await getPrisma().pushSubscription.upsert({
    where: { endpoint: record.endpoint },
    create: {
      endpoint: record.endpoint,
      p256dh: record.p256dh,
      auth: record.auth,
      expirationTime: record.expirationTime,
    },
    update: {
      p256dh: record.p256dh,
      auth: record.auth,
      expirationTime: record.expirationTime,
    },
    select: { id: true },
  });
}

/** Removes one device. Returns whether a row was actually there. */
export async function removePushSubscription(
  endpoint: string,
): Promise<boolean> {
  const result = await getPrisma().pushSubscription.deleteMany({
    where: { endpoint },
  });

  return result.count > 0;
}

/**
 * Sends one short notification to every subscribed device except the one that
 * performed the action.
 *
 * Expired rows are pruned first, and a device the push service reports as gone
 * (404/410) is deleted afterwards, so dead subscriptions do not accumulate.
 * Any other failure is logged without the endpoint — the URL is a capability —
 * and the remaining devices still receive the notification.
 */
export async function sendPushToDevices(
  event: PushEventName,
  { excludeEndpoint }: { excludeEndpoint?: string | null } = {},
): Promise<void> {
  if (!configureVapid()) {
    return;
  }

  try {
    const prisma = getPrisma();
    const now = new Date();

    await prisma.pushSubscription.deleteMany({
      where: { expirationTime: { not: null, lte: now } },
    });

    const subscriptions = await prisma.pushSubscription.findMany({
      where: excludeEndpoint ? { endpoint: { not: excludeEndpoint } } : undefined,
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify(pushMessageFor(event));
    const outcomes = await Promise.allSettled(
      subscriptions.map((subscription) =>
        sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
          { TTL: TTL_SECONDS },
        ),
      ),
    );

    const gone: string[] = [];

    outcomes.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") {
        return;
      }

      const status = (outcome.reason as { statusCode?: number } | null)
        ?.statusCode;

      // 404 and 410 are the push service saying this subscription no longer
      // exists; every other status may be transient.
      if (status === 404 || status === 410) {
        gone.push(subscriptions[index].endpoint);
        return;
      }

      console.error(
        `Push delivery to one device failed with status ${status ?? "unknown"}.`,
      );
    });

    if (gone.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: gone } },
      });
    }
  } catch (error) {
    // Delivery is best effort: a database or network problem here must not
    // surface anywhere near the action that succeeded.
    console.error(
      "Push delivery could not run.",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

/**
 * Queues a notification for the other devices once the response is sent.
 *
 * Call this only after the operation it reports has completed. The originating
 * device is read from its own cookie, so no route has to accept a body field
 * for it, and a missing or malformed cookie simply means nobody is excluded.
 */
export function notifyOtherDevices(
  request: Request,
  event: PushEventName,
): void {
  const excludeEndpoint = readDeviceEndpoint(request.headers.get("cookie"));

  after(() => sendPushToDevices(event, { excludeEndpoint }));
}
