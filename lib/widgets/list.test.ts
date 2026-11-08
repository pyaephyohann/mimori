import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { WidgetRecord } from "./catalog.ts";
import { restoreWidget, withoutWidget } from "./list.ts";

function widget(id: string, z: number): WidgetRecord {
  return {
    id,
    kind: "love-note",
    config: {
      position: { x: 0, y: 0 },
      size: "md",
      z,
      text: "",
      date: "",
    },
  } as unknown as WidgetRecord;
}

describe("withoutWidget", () => {
  it("removes only the widget with the given id", () => {
    const list = [widget("a", 1), widget("b", 2), widget("c", 3)];

    assert.deepEqual(
      withoutWidget(list, "b").map((item) => item.id),
      ["a", "c"],
    );
  });

  it("leaves the list unchanged when the id is absent", () => {
    const list = [widget("a", 1), widget("b", 2)];

    assert.deepEqual(
      withoutWidget(list, "missing").map((item) => item.id),
      ["a", "b"],
    );
  });
});

describe("restoreWidget", () => {
  it("puts a removed widget back in z order", () => {
    const list = [widget("a", 1), widget("c", 3)];

    assert.deepEqual(
      restoreWidget(list, widget("b", 2)).map((item) => item.id),
      ["a", "b", "c"],
    );
  });

  it("does not duplicate a widget that is already present", () => {
    const list = [widget("a", 1), widget("b", 2)];

    assert.deepEqual(
      restoreWidget(list, widget("b", 2)).map((item) => item.id),
      ["a", "b"],
    );
  });

  it("restores after a remove, so a failed delete leaves the widget visible", () => {
    const list = [widget("a", 1), widget("b", 2), widget("c", 3)];
    const removed = list[1];
    const afterRemove = withoutWidget(list, removed.id);

    assert.deepEqual(
      restoreWidget(afterRemove, removed).map((item) => item.id),
      ["a", "b", "c"],
    );
  });
});
