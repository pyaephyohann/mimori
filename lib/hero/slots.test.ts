import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HERO_SLOT_IDS,
  MAX_HERO_TITLE_LENGTH,
  applyHeroAssignment,
  buildHeroSlots,
  parseHeroAssignments,
  parseHeroReplacement,
  type HeroAssignment,
} from "./slots.ts";
import type { Photo } from "../photo.ts";

const photoA: Photo = {
  id: "photo-a",
  src: "https://res.cloudinary.com/demo/image/upload/a.jpg",
  caption: "us",
  alt: "us",
};

const photoB: Photo = {
  id: "photo-b",
  src: "https://res.cloudinary.com/demo/image/upload/b.jpg",
  caption: "this day",
  alt: "this day",
};

const photosById = new Map([
  [photoA.id, photoA],
  [photoB.id, photoB],
]);

describe("buildHeroSlots", () => {
  it("always returns eight slots, in fixed order", () => {
    const slots = buildHeroSlots([], new Map());

    assert.equal(slots.length, 8);
    assert.deepEqual(
      slots.map((slot) => slot.id),
      [...HERO_SLOT_IDS],
    );
    assert.ok(slots.every((slot) => slot.photo === null));
  });

  it("fills only the assigned slots and keeps the rest empty", () => {
    const slots = buildHeroSlots(
      [{ slotId: "hero-slot-3", photoId: photoB.id, title: "our trip" }],
      photosById,
    );

    assert.equal(slots[2]?.photo?.id, photoB.id);
    assert.equal(slots[2]?.title, "our trip");
    assert.equal(slots.filter((slot) => slot.photo === null).length, 7);
  });

  it("empties a slot whose photo no longer exists", () => {
    const slots = buildHeroSlots(
      [{ slotId: "hero-slot-1", photoId: "photo-gone", title: "gone" }],
      photosById,
    );

    assert.equal(slots[0]?.photo, null);
    assert.equal(slots[0]?.title, "");
  });
});

describe("parseHeroAssignments", () => {
  it("reads stored slots and drops unsafe or incomplete entries", () => {
    const assignments = parseHeroAssignments({
      slots: [
        { slotId: "hero-slot-2", photoId: photoA.id, title: "  our trip  " },
        { slotId: "hero-slot-9", photoId: photoA.id, title: "wrong slot" },
        { slotId: "hero-slot-4", photoId: "", title: "no photo" },
        { slotId: "hero-slot-5", photoId: photoA.id },
        "not an entry",
        null,
      ],
    });

    assert.deepEqual(assignments, [
      { slotId: "hero-slot-2", photoId: photoA.id, title: "our trip" },
      // A missing title is kept as "": the slot stays assigned but silent.
      { slotId: "hero-slot-5", photoId: photoA.id, title: "" },
    ]);
  });

  it("keeps the last entry when a slot is stored twice", () => {
    const assignments = parseHeroAssignments({
      slots: [
        { slotId: "hero-slot-1", photoId: photoA.id, title: "one" },
        { slotId: "hero-slot-1", photoId: photoB.id, title: "two" },
      ],
    });

    assert.deepEqual(assignments, [
      { slotId: "hero-slot-1", photoId: photoB.id, title: "two" },
    ]);
  });

  it("drops a title that is too long rather than showing a truncated label", () => {
    const assignments = parseHeroAssignments({
      slots: [
        {
          slotId: "hero-slot-1",
          photoId: photoA.id,
          title: "x".repeat(MAX_HERO_TITLE_LENGTH + 1),
        },
      ],
    });

    assert.equal(assignments[0]?.title, "");
  });

  it("tolerates a missing, empty or malformed config", () => {
    assert.deepEqual(parseHeroAssignments(null), []);
    assert.deepEqual(parseHeroAssignments({}), []);
    assert.deepEqual(parseHeroAssignments({ slots: "nope" }), []);
    assert.deepEqual(parseHeroAssignments([]), []);
  });
});

describe("applyHeroAssignment", () => {
  it("replaces one slot and leaves the others untouched", () => {
    const current: HeroAssignment[] = [
      { slotId: "hero-slot-1", photoId: photoA.id, title: "one" },
    ];

    const next = applyHeroAssignment(current, {
      slotId: "hero-slot-5",
      photoId: photoB.id,
      title: "five",
    });

    assert.deepEqual(next, [
      { slotId: "hero-slot-1", photoId: photoA.id, title: "one" },
      { slotId: "hero-slot-5", photoId: photoB.id, title: "five" },
    ]);
  });

  it("keeps the list in slot order when a slot is overwritten", () => {
    const next = applyHeroAssignment(
      [
        { slotId: "hero-slot-6", photoId: photoA.id, title: "six" },
        { slotId: "hero-slot-2", photoId: photoA.id, title: "two" },
      ],
      { slotId: "hero-slot-6", photoId: photoB.id, title: "six again" },
    );

    assert.deepEqual(
      next.map((entry) => entry.slotId),
      ["hero-slot-2", "hero-slot-6"],
    );
    assert.equal(next[1]?.title, "six again");
    assert.equal(next.length, 2);
  });
});

describe("parseHeroReplacement", () => {
  it("accepts a known slot, a photo id and a trimmed title", () => {
    assert.deepEqual(
      parseHeroReplacement({
        slotId: "hero-slot-1",
        sourceId: photoA.id,
        title: "  our trip  ",
      }),
      {
        ok: true,
        value: { slotId: "hero-slot-1", sourceId: photoA.id, title: "our trip" },
      },
    );
  });

  it("treats a missing title as keeping the existing one", () => {
    assert.deepEqual(
      parseHeroReplacement({ slotId: "hero-slot-1", sourceId: photoA.id }),
      {
        ok: true,
        value: { slotId: "hero-slot-1", sourceId: photoA.id, title: null },
      },
    );
  });

  it("rejects an empty, whitespace-only or over-long title", () => {
    assert.equal(
      parseHeroReplacement({
        slotId: "hero-slot-1",
        sourceId: photoA.id,
        title: "",
      }).ok,
      false,
    );
    assert.equal(
      parseHeroReplacement({
        slotId: "hero-slot-1",
        sourceId: photoA.id,
        title: "   ",
      }).ok,
      false,
    );
    assert.equal(
      parseHeroReplacement({
        slotId: "hero-slot-1",
        sourceId: photoA.id,
        title: "x".repeat(MAX_HERO_TITLE_LENGTH + 1),
      }).ok,
      false,
    );
  });

  it("rejects an unknown slot", () => {
    assert.equal(
      parseHeroReplacement({ slotId: "hero-slot-9", sourceId: photoA.id }).ok,
      false,
    );
  });

  it("rejects a missing photo id or a body that is not an object", () => {
    assert.equal(parseHeroReplacement({ slotId: "hero-slot-1" }).ok, false);
    assert.equal(
      parseHeroReplacement({ slotId: "hero-slot-1", sourceId: "   " }).ok,
      false,
    );
    assert.equal(parseHeroReplacement("hero-slot-1").ok, false);
  });
});
