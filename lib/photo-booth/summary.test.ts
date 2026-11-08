import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeSessionSummary, type BoothSessionSummary } from "./summary.ts";

function session(
  id: string,
  createdAt: string,
  overrides: Partial<BoothSessionSummary> = {},
): BoothSessionSummary {
  return {
    id,
    createdAt,
    photoCount: 4,
    layout: "strip",
    borderKey: "lovely-hearts",
    caption: "",
    printDate: null,
    print: { id: `print-${id}`, src: `https://example.test/${id}.jpg` },
    shotCount: 4,
    shotThumbs: [],
    ...overrides,
  };
}

describe("mergeSessionSummary", () => {
  it("puts a new session first, newest first", () => {
    const list = [
      session("b", "2026-11-02T10:00:00.000Z"),
      session("a", "2026-11-01T10:00:00.000Z"),
    ];

    const merged = mergeSessionSummary(
      list,
      session("c", "2026-11-03T10:00:00.000Z"),
    );

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ["c", "b", "a"],
    );
  });

  it("replaces an updated session instead of listing it twice", () => {
    const list = [
      session("b", "2026-11-03T10:00:00.000Z"),
      session("a", "2026-11-02T10:00:00.000Z"),
    ];

    const merged = mergeSessionSummary(
      list,
      session("a", "2026-11-02T10:00:00.000Z", {
        caption: "Just Us Two",
        borderKey: "love-letter",
        print: { id: "print-a-2", src: "https://example.test/a-2.jpg" },
      }),
    );

    assert.equal(merged.length, 2);
    assert.deepEqual(
      merged.map((entry) => entry.id),
      ["b", "a"],
    );
    assert.equal(merged[1].caption, "Just Us Two");
    assert.equal(merged[1].print.src, "https://example.test/a-2.jpg");
  });

  it("does not mutate the list it was given", () => {
    const list = [session("a", "2026-11-01T10:00:00.000Z")];
    const copy = [...list];

    mergeSessionSummary(list, session("b", "2026-11-02T10:00:00.000Z"));

    assert.deepEqual(list, copy);
  });

  it("breaks createdAt ties by id, like the listing endpoint", () => {
    const merged = mergeSessionSummary(
      [session("a", "2026-11-03T10:00:00.000Z")],
      session("b", "2026-11-03T10:00:00.000Z"),
    );

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ["b", "a"],
    );
  });
});
