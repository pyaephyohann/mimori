import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCreate, parseUpdate } from "./validate.ts";

const allowedPhotoIds = new Set(["a", "b", "c", "d", "e", "f", "g", "h"]);

describe("parseCreate", () => {
  it("accepts a polaroid with one gallery photo", () => {
    const result = parseCreate(
      {
        kind: "polaroid",
        photoIds: ["a"],
        size: "md",
        position: { x: 32, y: 48 },
      },
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    assert.deepEqual(result.value.photoIds, ["a"]);
    assert.deepEqual(result.value.position, { x: 32, y: 48 });
    assert.equal(result.value.size, "md");
  });

  it("rejects an unknown style", () => {
    const result = parseCreate({ kind: "slideshow" }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects a photo widget with no photos", () => {
    const result = parseCreate({ kind: "polaroid", photoIds: [] }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects an id that is not in the gallery", () => {
    const result = parseCreate(
      { kind: "polaroid", photoIds: ["not-a-photo"] },
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.error, /gallery/);
  });

  it("rejects the same photo twice", () => {
    const result = parseCreate(
      { kind: "photo-stack", photoIds: ["a", "a"] },
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.error, /twice/);
  });

  it("enforces each style's photo range", () => {
    const tooFew = parseCreate({ kind: "photo-grid", photoIds: ["a"] }, allowedPhotoIds);
    const tooMany = parseCreate(
      { kind: "photo-grid", photoIds: ["a", "b", "c", "d", "e", "f", "g"] },
      allowedPhotoIds,
    );

    assert.equal(tooFew.ok, false);
    assert.equal(tooMany.ok, false);
  });

  it("accepts a romantic widget with no photos", () => {
    const result = parseCreate(
      { kind: "love-note", text: "  hello love  " },
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    assert.deepEqual(result.value.photoIds, []);
    assert.equal(result.value.text, "hello love");
  });

  it("falls back to the style's default size", () => {
    const result = parseCreate({ kind: "photo-grid", photoIds: ["a", "b"] }, allowedPhotoIds);

    assert.ok(result.ok);
    assert.equal(result.value.size, "lg");
  });

  it("rejects a note longer than the limit", () => {
    const result = parseCreate(
      { kind: "love-note", text: "x".repeat(500) },
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });
});

describe("parseUpdate", () => {
  it("snaps a moved position to the grid", () => {
    const result = parseUpdate(
      { position: { x: 41, y: 77 } },
      "polaroid",
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    assert.deepEqual(result.value.position, { x: 48, y: 80 });
  });

  it("rejects a style change", () => {
    const result = parseUpdate(
      { kind: "love-note" },
      "polaroid",
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });

  it("rejects an impossible date", () => {
    const result = parseUpdate(
      { date: "2024-02-31" },
      "our-counter",
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });

  it("accepts a real date", () => {
    const result = parseUpdate(
      { date: "2024-02-29" },
      "our-counter",
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    assert.equal(result.value.date, "2024-02-29");
  });

  it("rejects an empty body", () => {
    const result = parseUpdate({}, "polaroid", allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects more photos than the style allows", () => {
    const result = parseUpdate(
      { photoIds: ["a", "b"] },
      "polaroid",
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });
});
