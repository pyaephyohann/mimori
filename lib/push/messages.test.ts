import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEVICE_COOKIE,
  isPushEndpoint,
  isSafeNotificationPath,
  parsePushPayload,
  parsePushSubscriptionBody,
  pushMessageFor,
  readDeviceEndpoint,
  type PushEventName,
} from "./messages.ts";

const EVENTS: PushEventName[] = [
  "photo-uploaded",
  "photo-deleted",
  "collection-created",
  "collection-deleted",
  "booth-saved",
  "widget-added",
  "widget-removed",
];

const P256DH = "B".repeat(88);
const AUTH = "C".repeat(22);
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";

describe("pushMessageFor", () => {
  it("names the app Mimori and uses one short line per action", () => {
    for (const event of EVENTS) {
      const message = pushMessageFor(event);

      assert.equal(message.title, "Mimori");
      assert.ok(message.body.length > 0 && message.body.length <= 60);
      assert.ok(!message.body.includes("\n"));
      assert.equal(isSafeNotificationPath(message.url), true);
      assert.ok(message.tag.startsWith("mimori-"));
    }
  });

  it("sends each action to the page it belongs to", () => {
    assert.equal(pushMessageFor("photo-uploaded").url, "/gallery");
    assert.equal(pushMessageFor("photo-deleted").url, "/gallery");
    assert.equal(pushMessageFor("collection-created").url, "/collections");
    assert.equal(pushMessageFor("collection-deleted").url, "/collections");
    assert.equal(pushMessageFor("booth-saved").url, "/photo-booth");
    assert.equal(pushMessageFor("widget-added").url, "/");
    assert.equal(pushMessageFor("widget-removed").url, "/");
  });

  it("matches the requested wording", () => {
    assert.equal(pushMessageFor("photo-uploaded").body, "A new photo uploaded 📸");
    assert.equal(
      pushMessageFor("collection-created").body,
      "A new collection created 🌷",
    );
    assert.equal(pushMessageFor("photo-deleted").body, "A photo was deleted");
    assert.equal(
      pushMessageFor("collection-deleted").body,
      "A collection was deleted",
    );
    assert.equal(
      pushMessageFor("booth-saved").body,
      "A new photobooth memory saved 💗",
    );
    assert.equal(pushMessageFor("widget-added").body, "A new widget added 🎀");
    assert.equal(pushMessageFor("widget-removed").body, "A widget was removed");
  });
});

describe("isSafeNotificationPath", () => {
  it("accepts same-origin paths", () => {
    assert.equal(isSafeNotificationPath("/"), true);
    assert.equal(isSafeNotificationPath("/gallery"), true);
    assert.equal(isSafeNotificationPath("/photo-booth?id=1"), true);
  });

  it("refuses anything that could leave this origin", () => {
    for (const value of [
      "//evil.example/gallery",
      "https://evil.example/",
      "javascript:alert(1)",
      "/\\evil.example",
      "/gallery\n",
      "gallery",
      "",
      42,
      null,
    ]) {
      assert.equal(isSafeNotificationPath(value), false, String(value));
    }
  });
});

describe("parsePushPayload", () => {
  it("keeps a short body and the destination", () => {
    const parsed = parsePushPayload({
      title: "Something else",
      body: "A new photo uploaded 📸",
      url: "/gallery",
      tag: "mimori-photo-uploaded",
    });

    assert.deepEqual(parsed, {
      title: "Mimori",
      body: "A new photo uploaded 📸",
      url: "/gallery",
      tag: "mimori-photo-uploaded",
    });
  });

  it("falls back to the home page for an unsafe destination", () => {
    assert.equal(
      parsePushPayload({ body: "Hello", url: "https://evil.example/" })?.url,
      "/",
    );
  });

  it("truncates long copy and refuses an empty body", () => {
    const long = parsePushPayload({ body: "x".repeat(400), url: "/" });
    assert.equal(long?.body.length, 180);

    assert.equal(parsePushPayload({ body: "  ", url: "/" }), null);
    assert.equal(parsePushPayload(null), null);
    assert.equal(parsePushPayload("nope"), null);
  });
});

describe("parsePushSubscriptionBody", () => {
  it("accepts the four fields a PushSubscription exposes", () => {
    const parsed = parsePushSubscriptionBody({
      endpoint: ENDPOINT,
      expirationTime: 1_700_000_000_000,
      keys: { p256dh: P256DH, auth: AUTH },
      ignored: "smuggled",
    });

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.deepEqual(Object.keys(parsed.value).sort(), [
        "auth",
        "endpoint",
        "expirationTime",
        "p256dh",
      ]);
      assert.equal(parsed.value.expirationTime?.toISOString(), "2023-11-14T22:13:20.000Z");
    }
  });

  it("treats a missing expiry as null", () => {
    const parsed = parsePushSubscriptionBody({
      endpoint: ENDPOINT,
      expirationTime: null,
      keys: { p256dh: P256DH, auth: AUTH },
    });

    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.value.expirationTime, null);
  });

  it("rejects a non-https endpoint, short keys and a bad expiry", () => {
    const base = {
      endpoint: ENDPOINT,
      expirationTime: null,
      keys: { p256dh: P256DH, auth: AUTH },
    };

    const cases: unknown[] = [
      { ...base, endpoint: "http://fcm.googleapis.com/fcm/send/abc" },
      { ...base, endpoint: "not a url" },
      { ...base, keys: { p256dh: "short", auth: AUTH } },
      { ...base, keys: { p256dh: P256DH, auth: "short" } },
      { ...base, keys: { p256dh: `${"B".repeat(80)}!`, auth: AUTH } },
      { ...base, expirationTime: -1 },
      { ...base, expirationTime: "soon" },
      { endpoint: ENDPOINT, keys: null },
      null,
      "nope",
    ];

    for (const value of cases) {
      assert.equal(parsePushSubscriptionBody(value).ok, false);
    }
  });
});

describe("readDeviceEndpoint", () => {
  it("reads only the device cookie and ignores the rest", () => {
    const header = `theme=pink; ${DEVICE_COOKIE}=${encodeURIComponent(ENDPOINT)}; other=1`;
    assert.equal(readDeviceEndpoint(header), ENDPOINT);
  });

  it("returns null when absent, malformed or not https", () => {
    assert.equal(readDeviceEndpoint(null), null);
    assert.equal(readDeviceEndpoint("theme=pink"), null);
    assert.equal(
      readDeviceEndpoint(`${DEVICE_COOKIE}=${encodeURIComponent("http://x.test/a")}`),
      null,
    );
    assert.equal(readDeviceEndpoint(`${DEVICE_COOKIE}=%E0%A4%A`), null);
  });
});

describe("isPushEndpoint", () => {
  it("requires an https URL", () => {
    assert.equal(isPushEndpoint(ENDPOINT), true);
    assert.equal(isPushEndpoint("http://localhost:3000/push"), false);
    assert.equal(isPushEndpoint(undefined), false);
  });
});
