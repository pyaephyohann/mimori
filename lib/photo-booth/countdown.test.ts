import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COUNTDOWN_SECONDS, countdownNumber } from "./countdown.ts";

describe("countdownNumber", () => {
  it("starts at the full countdown", () => {
    assert.equal(countdownNumber(COUNTDOWN_SECONDS * 1000), 3);
  });

  it("rounds a partial second up", () => {
    assert.equal(countdownNumber(2999), 3);
    assert.equal(countdownNumber(2100), 3);
    assert.equal(countdownNumber(2000), 2);
    assert.equal(countdownNumber(1200), 2);
  });

  it("counts down to zero", () => {
    assert.equal(countdownNumber(1), 1);
    assert.equal(countdownNumber(0), 0);
    assert.equal(countdownNumber(-500), 0);
  });

  it("never runs past the countdown's range", () => {
    assert.equal(countdownNumber(9999), 3);
  });

  it("falls back to the full countdown for a bad value", () => {
    assert.equal(countdownNumber(Number.NaN), 3);
    assert.equal(countdownNumber(Number.POSITIVE_INFINITY), 3);
  });
});
