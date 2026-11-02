import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SNAP_GRID, daysSince, snapToGrid } from "./catalog.ts";
import {
  WIDGET_GAP,
  boxesOverlap,
  clampToCanvas,
  contentHeight,
  settlePosition,
} from "./layout.ts";

const md = { width: 288, height: 268 };

describe("boxesOverlap", () => {
  it("detects an overlap", () => {
    assert.ok(
      boxesOverlap(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: 50, width: 100, height: 100 },
      ),
    );
  });

  it("keeps the gap between neighbours", () => {
    const left = { x: 0, y: 0, width: 100, height: 100 };
    const touching = { x: 100 + WIDGET_GAP - 1, y: 0, width: 100, height: 100 };
    const clear = { x: 100 + WIDGET_GAP + 1, y: 0, width: 100, height: 100 };

    assert.ok(boxesOverlap(left, touching), "within the gap counts as touching");
    assert.ok(!boxesOverlap(left, clear));
  });
});

describe("clampToCanvas", () => {
  it("keeps a widget inside the right edge", () => {
    const placed = clampToCanvas({ x: 5000, y: 0 }, md, 600);

    assert.equal(placed.x, 600 - md.width);
  });

  it("never goes negative and stays on the grid", () => {
    const placed = clampToCanvas({ x: -40, y: -80 }, md, 900);

    assert.equal(placed.x, 0);
    assert.equal(placed.y, 0);
    assert.equal(placed.x % SNAP_GRID, 0);
  });

  it("snaps a free coordinate to the grid", () => {
    assert.equal(clampToCanvas({ x: 41, y: 77 }, md, 1200).x, snapToGrid(41));
    assert.equal(clampToCanvas({ x: 41, y: 77 }, md, 1200).y, snapToGrid(77));
  });
});

describe("settlePosition", () => {
  it("keeps the requested spot when it is free", () => {
    assert.deepEqual(
      settlePosition({ x: 64, y: 32 }, md, [], 1200),
      { x: 64, y: 32 },
    );
  });

  it("moves away from an occupied spot without overlapping anything", () => {
    const occupied = [{ x: 0, y: 0, width: md.width, height: md.height }];
    const placed = settlePosition({ x: 0, y: 0 }, md, occupied, 1200);
    const box = { ...placed, ...md };

    assert.notDeepEqual(placed, { x: 0, y: 0 });
    assert.ok(!boxesOverlap(box, occupied[0]));
  });

  it("stays on the grid and inside the canvas when crowded", () => {
    const occupied = Array.from({ length: 8 }, (_value, index) => ({
      x: index * 300,
      y: 0,
      width: md.width,
      height: md.height,
    }));
    const placed = settlePosition({ x: 0, y: 0 }, md, occupied, 1200);

    assert.equal(placed.x % SNAP_GRID, 0);
    assert.equal(placed.y % SNAP_GRID, 0);
    assert.ok(placed.x + md.width <= 1200);
    assert.ok(
      occupied.every((box) => !boxesOverlap({ ...placed, ...md }, box)),
    );
  });
});

describe("contentHeight", () => {
  it("reserves room below the lowest widget", () => {
    assert.equal(
      contentHeight([{ x: 0, y: 100, width: 288, height: 268 }], 360),
      100 + 268 + SNAP_GRID,
    );
  });

  it("falls back to the minimum for an empty canvas", () => {
    assert.equal(contentHeight([], 360), 360);
  });
});

describe("daysSince", () => {
  it("counts whole days between dates", () => {
    assert.equal(daysSince("2024-02-14", new Date("2024-02-16T12:00:00Z")), 2);
  });

  it("returns null for an empty or invalid date", () => {
    assert.equal(daysSince(""), null);
    assert.equal(daysSince("14/02/2024"), null);
  });
});
