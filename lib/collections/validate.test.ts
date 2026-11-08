import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coverPhotoId, matchesQuery, sortCollections } from "./catalog.ts";
import { parseCreate, parseMove, parseUpdate } from "./validate.ts";

const allowedPhotoIds = new Set(["a", "b", "c"]);

const collection = {
  id: "c1",
  name: "Summer",
  description: "Warm evenings",
  pinned: false,
  coverPhotoId: null,
  photoIds: ["a", "b"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("parseCreate", () => {
  it("accepts a name, description and photos", () => {
    const result = parseCreate(
      {
        name: "  Our   trips ",
        description: " Everywhere we went ",
        photoIds: ["a", "b"],
        coverPhotoId: "b",
      },
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    // Runs of whitespace collapse, so near-duplicate names cannot sneak in.
    assert.equal(result.value.name, "Our trips");
    assert.equal(result.value.description, "Everywhere we went");
    assert.deepEqual(result.value.photoIds, ["a", "b"]);
    assert.equal(result.value.coverPhotoId, "b");
  });

  it("requires a name", () => {
    const missing = parseCreate({}, allowedPhotoIds);
    const blank = parseCreate({ name: "   " }, allowedPhotoIds);

    assert.equal(missing.ok, false);
    assert.equal(blank.ok, false);
  });

  it("rejects a name over the limit", () => {
    const result = parseCreate({ name: "x".repeat(61) }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("treats an empty description as none", () => {
    const result = parseCreate({ name: "Rainy days", description: "  " }, allowedPhotoIds);

    assert.ok(result.ok);
    assert.equal(result.value.description, null);
  });

  it("rejects photos that are not in the gallery", () => {
    const result = parseCreate({ name: "Trips", photoIds: ["not-a-photo"] }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects the same photo twice", () => {
    const result = parseCreate({ name: "Trips", photoIds: ["a", "a"] }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects a cover outside the gallery", () => {
    const result = parseCreate(
      { name: "Trips", coverPhotoId: "missing" },
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });
});

describe("parseUpdate", () => {
  it("accepts a pin toggle", () => {
    const result = parseUpdate({ pinned: true }, allowedPhotoIds);

    assert.ok(result.ok);
    assert.deepEqual(result.value, { pinned: true });
  });

  it("clears a description with null", () => {
    const result = parseUpdate({ description: null }, allowedPhotoIds);

    assert.ok(result.ok);
    assert.equal(result.value.description, null);
  });

  it("accepts add and remove lists", () => {
    const result = parseUpdate(
      { addPhotoIds: ["c"], removePhotoIds: ["a"] },
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    assert.deepEqual(result.value.addPhotoIds, ["c"]);
    assert.deepEqual(result.value.removePhotoIds, ["a"]);
  });

  it("rejects an empty patch", () => {
    const result = parseUpdate({}, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects a non-boolean pinned", () => {
    const result = parseUpdate({ pinned: "yes" }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });
});

describe("parseMove", () => {
  it("accepts a move between two collections", () => {
    const result = parseMove(
      { fromId: "c1", toId: "c2", photoIds: ["a"] },
      allowedPhotoIds,
    );

    assert.ok(result.ok);
    assert.equal(result.value.fromId, "c1");
    assert.equal(result.value.toId, "c2");
  });

  it("rejects moving into the same collection", () => {
    const result = parseMove(
      { fromId: "c1", toId: "c1", photoIds: ["a"] },
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });

  it("rejects a move with nothing to move", () => {
    const result = parseMove({ fromId: "c1", toId: "c2", photoIds: [] }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects a move with no destination or source", () => {
    const result = parseMove({ photoIds: ["a"] }, allowedPhotoIds);

    assert.equal(result.ok, false);
  });

  it("rejects unknown photos", () => {
    const result = parseMove(
      { fromId: "c1", toId: "c2", photoIds: ["zzz"] },
      allowedPhotoIds,
    );

    assert.equal(result.ok, false);
  });
});

describe("collection helpers", () => {
  it("prefers an explicit cover and falls back to the first photo", () => {
    assert.equal(coverPhotoId(collection), "a");
    assert.equal(coverPhotoId({ ...collection, coverPhotoId: "b" }), "b");
    assert.equal(coverPhotoId({ ...collection, photoIds: [] }), null);
  });

  it("matches name and description case-insensitively", () => {
    assert.equal(matchesQuery(collection, "sum"), true);
    assert.equal(matchesQuery(collection, "EVENINGS"), true);
    assert.equal(matchesQuery(collection, "winter"), false);
    assert.equal(matchesQuery(collection, "  "), true);
  });

  it("sorts by newest, name and photo count", () => {
    const older = {
      ...collection,
      id: "c0",
      name: "Zebra",
      createdAt: "2025-01-01T00:00:00.000Z",
      photoIds: ["a"],
    };

    assert.deepEqual(
      sortCollections([older, collection], "recent").map((item) => item.id),
      ["c1", "c0"],
    );
    assert.deepEqual(
      sortCollections([older, collection], "name").map((item) => item.id),
      ["c1", "c0"],
    );
    assert.deepEqual(
      sortCollections([older, collection], "photos").map((item) => item.id),
      ["c1", "c0"],
    );
  });
});
