import {
  parsePushSubscriptionBody,
  isPushEndpoint,
} from "@/lib/push/messages";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push/server";

/**
 * /api/push/subscribe — this device's subscription.
 *
 * POST stores the browser's `PushSubscription`, or refreshes one that already
 * exists: the endpoint is unique, so re-subscribing (a re-granted permission, a
 * renewed expiry) updates the same row. DELETE forgets a device that has
 * unsubscribed or had its permission revoked.
 *
 * Mimori has no accounts (D-013), so there is nothing to authenticate: the
 * endpoint is the push service's own opaque URL, and the only thing the server
 * ever does with it is encrypt to it or remove it. Nothing else from the client
 * is accepted.
 */

const STORE_UNAVAILABLE = "The notification store is unavailable right now.";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = parsePushSubscriptionBody(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await savePushSubscription(parsed.value);

    return Response.json({ subscribed: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/push/subscribe failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const endpoint =
    typeof body === "object" && body !== null
      ? (body as { endpoint?: unknown }).endpoint
      : undefined;

  if (!isPushEndpoint(endpoint)) {
    return Response.json(
      { error: "That push endpoint is not valid." },
      { status: 400 },
    );
  }

  try {
    await removePushSubscription(endpoint);

    // Removing a device twice is not an error: the caller's intent is met.
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/push/subscribe failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}
