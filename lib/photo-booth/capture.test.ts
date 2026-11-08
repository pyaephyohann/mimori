import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_CAPTURE_WIDTH, captureSize } from "./capture.ts";

describe("captureSize", () => {
  it("keeps a small frame at its own size", () => {
    assert.deepEqual(captureSize(640, 480), { width: 640, height: 480 });
  });

  it("scales a wide frame down to the limit", () => {
    const size = captureSize(1920, 1080);

    assert.ok(size);
    assert.equal(size.width, MAX_CAPTURE_WIDTH);
    assert.equal(size.height, 608);
  });

  it("scales a portrait frame by its width", () => {
    const size = captureSize(1440, 1920);

    assert.ok(size);
    assert.equal(size.width, MAX_CAPTURE_WIDTH);
    assert.equal(size.height, 1440);
  });

  it("never upscales", () => {
    assert.deepEqual(captureSize(320, 240), { width: 320, height: 240 });
  });

  it("returns null when the video has no dimensions yet", () => {
    assert.equal(captureSize(0, 0), null);
    assert.equal(captureSize(1280, 0), null);
    assert.equal(captureSize(Number.NaN, 720), null);
    assert.equal(captureSize(-10, 20), null);
  });

  it("rounds to whole pixels", () => {
    const size = captureSize(1279, 959);

    assert.ok(size);
    assert.equal(Number.isInteger(size.width), true);
    assert.equal(Number.isInteger(size.height), true);
  });
});
