import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  stripPhotoFromHeroConfig,
  stripPhotoFromWidgetConfig,
} from "./gallery-cleanup.ts";

const likeWidget = "photo-like";
const otherPhoto = "photo-other";

describe("stripPhotoFromWidgetConfig", () => {
  it("removes only the deleted photo and keeps the widget's other settings", () => {
    const config = {
      photoIds: [likeWidget, otherPhoto],
      text: "our little place",
      date: "2024-02-14",
      position: { x: 32, y: 16 },
      size: "lg",
      z: 3,
    };

    assert.deepEqual(stripPhotoFromWidgetConfig(config, likeWidget), {
      photoIds: [otherPhoto],
      text: "our little place",
      date: "2024-02-14",
      position: { x: 32, y: 16 },
      size: "lg",
      z: 3,
    });
  });

  it("keeps display order when the deleted photo sits in the middle", () => {
    const next = stripPhotoFromWidgetConfig(
      { photoIds: ["a", likeWidget, "c"] },
      likeWidget,
    );

    assert.deepEqual(next, { photoIds: ["a", "c"] });
  });

  it("leaves a widget with no remaining photos rather than dropping it", () => {
    assert.deepEqual(stripPhotoFromWidgetConfig({ photoIds: [likeWidget] }, likeWidget), {
      photoIds: [],
    });
  });

  it("reports nothing to change for an unrelated widget", () => {
    assert.equal(
      stripPhotoFromWidgetConfig({ photoIds: [otherPhoto] }, likeWidget),
      null,
    );
  });

  it("ignores malformed or photo-less configs", () => {
    assert.equal(stripPhotoFromWidgetConfig(null, likeWidget), null);
    assert.equal(stripPhotoFromWidgetConfig([likeWidget], likeWidget), null);
    assert.equal(stripPhotoFromWidgetConfig({ text: "hi" }, likeWidget), null);
    assert.equal(
      stripPhotoFromWidgetConfig({ photoIds: "not-a-list" }, likeWidget),
      null,
    );
  });
});

describe("stripPhotoFromHeroConfig", () => {
  const config = {
    slots: [
      { slotId: "hero-slot-1", photoId: likeWidget, title: "first" },
      { slotId: "hero-slot-2", photoId: otherPhoto, title: "second" },
    ],
  };

  it("empties the slot that held the deleted photo and keeps the others", () => {
    assert.deepEqual(stripPhotoFromHeroConfig(config, likeWidget), {
      slots: [{ slotId: "hero-slot-2", photoId: otherPhoto, title: "second" }],
    });
  });

  it("drops every assignment that pointed at the photo", () => {
    const twice = {
      slots: [
        { slotId: "hero-slot-1", photoId: likeWidget, title: "a" },
        { slotId: "hero-slot-3", photoId: likeWidget, title: "b" },
      ],
    };

    assert.deepEqual(stripPhotoFromHeroConfig(twice, likeWidget), { slots: [] });
  });

  it("reports nothing to change when the carousel does not use the photo", () => {
    assert.equal(stripPhotoFromHeroConfig(config, "photo-unused"), null);
  });

  it("ignores malformed configs, so a damaged row is never rewritten", () => {
    assert.equal(stripPhotoFromHeroConfig(null, likeWidget), null);
    assert.equal(stripPhotoFromHeroConfig({}, likeWidget), null);
    assert.equal(stripPhotoFromHeroConfig({ slots: "nope" }, likeWidget), null);
    assert.equal(
      stripPhotoFromHeroConfig(
        { slots: [{ slotId: "not-a-slot", photoId: likeWidget, title: "x" }] },
        likeWidget,
      ),
      null,
    );
  });
});
