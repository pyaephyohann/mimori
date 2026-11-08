import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { restoreBoothSession, type SavedSessionPayload } from "./restore.ts";

const PRINT = {
  id: "print-photo",
  src: "https://res.cloudinary.com/demo/image/upload/mimori/gallery/print.jpg",
};

function photo(id: string) {
  return {
    id,
    src: `https://res.cloudinary.com/demo/image/upload/mimori/photo-booth/${id}.jpg`,
  };
}

function payload(
  overrides: Partial<SavedSessionPayload> = {},
): SavedSessionPayload {
  return {
    id: "session-1",
    createdAt: "2026-11-03T10:00:00.000Z",
    photoCount: 4,
    layout: "strip",
    borderKey: "vintage-film",
    backgroundKey: "lavender",
    caption: "Just Us Two",
    showDate: true,
    printDate: "2026-11-03",
    spacing: 22,
    borderWidth: 64,
    stickers: [
      { id: "sticker-1", sticker: "bow", x: 0.2, y: 0.3, size: 0.14, rotate: -12 },
    ],
    print: PRINT,
    shots: [photo("shot-a"), photo("shot-b"), photo("shot-c"), photo("shot-d")].map(
      (entry, position) => ({ position, photo: entry }),
    ),
    ...overrides,
  };
}

describe("restoreBoothSession", () => {
  it("restores a saved session as editor state", () => {
    const result = restoreBoothSession(payload());

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.value.sessionId, "session-1");
    assert.equal(result.value.photoCount, 4);
    assert.equal(result.value.layout, "strip");
    assert.deepEqual(result.value.print, PRINT);
    assert.equal(result.value.config.borderKey, "vintage-film");
    assert.equal(result.value.config.backgroundKey, "lavender");
    assert.equal(result.value.config.caption, "Just Us Two");
    assert.equal(result.value.config.showDate, true);
    assert.equal(result.value.config.date, "2026-11-03");
    assert.equal(result.value.config.spacing, 22);
    assert.equal(result.value.config.borderWidth, 64);
    assert.equal(result.value.config.stickers.length, 1);
    assert.equal(result.value.config.stickers[0].sticker, "bow");
  });

  it("rehydrates the captures as saved image URLs, never as a new upload", () => {
    const result = restoreBoothSession(payload());

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.value.shots.length, 4);

    for (const [index, shot] of result.value.shots.entries()) {
      const photoId = ["shot-a", "shot-b", "shot-c", "shot-d"][index];

      assert.equal(shot.source, "saved");

      if (shot.source !== "saved") {
        continue;
      }

      assert.equal(shot.photoId, photoId);
      assert.equal(shot.id, `saved-shot-${photoId}`);
      assert.match(shot.url, /^https:\/\/res\.cloudinary\.com\//);
      assert.equal("blob" in shot, false);
    }
  });

  it("orders the captures by their stored position", () => {
    const ordered = ["a", "b", "c", "d"].map((id, position) => ({
      position,
      photo: photo(`shot-${id}`),
    }));

    const result = restoreBoothSession(
      payload({ shots: [ordered[2], ordered[0], ordered[3], ordered[1]] }),
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.deepEqual(
      result.value.shots.map((shot) =>
        shot.source === "saved" ? shot.photoId : shot.id,
      ),
      ["shot-a", "shot-b", "shot-c", "shot-d"],
    );
  });

  it("builds the summary the library card shows", () => {
    const result = restoreBoothSession(payload());

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.deepEqual(result.value.summary, {
      id: "session-1",
      createdAt: "2026-11-03T10:00:00.000Z",
      photoCount: 4,
      layout: "strip",
      borderKey: "vintage-film",
      caption: "Just Us Two",
      printDate: "2026-11-03",
      print: PRINT,
      shotCount: 4,
      shotThumbs: ["shot-a", "shot-b", "shot-c", "shot-d"].map(photo),
    });
  });

  it("keeps the date field usable when the print hides its date", () => {
    const result = restoreBoothSession(
      payload({ showDate: false, printDate: null }),
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.value.config.showDate, false);
    assert.match(result.value.config.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(result.value.summary.printDate, null);
  });

  it("reports a session whose captures are gone instead of shifting photos", () => {
    const shots = payload().shots;

    const shorter = restoreBoothSession(payload({ shots: shots.slice(0, 3) }));

    assert.equal(shorter.ok, false);

    if (!shorter.ok) {
      assert.match(shorter.error, /original photos are missing/);
    }

    const holed = restoreBoothSession(
      payload({ shots: [shots[0], shots[1], shots[3]] }),
    );

    assert.equal(holed.ok, false);
  });

  it("rejects a capture without its photo record", () => {
    const shots = payload().shots;
    const broken = restoreBoothSession(
      payload({
        shots: [{ position: 0, photo: null }, ...shots.slice(1)],
      }),
    );

    assert.equal(broken.ok, false);
  });

  it("rejects settings it cannot draw", () => {
    assert.equal(
      restoreBoothSession(payload({ borderKey: "sparkles" })).ok,
      false,
    );
    assert.equal(
      restoreBoothSession(payload({ backgroundKey: "neon" })).ok,
      false,
    );
    assert.equal(restoreBoothSession(payload({ spacing: 400 })).ok, false);
    assert.equal(restoreBoothSession(payload({ borderWidth: 1 })).ok, false);
    assert.equal(
      restoreBoothSession(payload({ printDate: "2026-02-30" })).ok,
      false,
    );
    assert.equal(
      restoreBoothSession(
        payload({
          stickers: [
            { id: "s1", sticker: "bow", x: 4, y: 0.3, size: 0.14, rotate: 0 },
          ],
        }),
      ).ok,
      false,
    );
  });

  it("rejects a body that is not a session", () => {
    for (const value of [null, undefined, {}, [], "session", 7]) {
      assert.equal(restoreBoothSession(value).ok, false);
    }
  });

  it("rejects a session without a finished print", () => {
    assert.equal(restoreBoothSession(payload({ print: null })).ok, false);
  });
});
