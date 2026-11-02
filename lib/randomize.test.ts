import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSameOrder, pickOrder, shuffle, type RandomSource } from "./randomize.ts";

const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Deterministic stand-in for Math.random. */
function seeded(seed: number): RandomSource {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function isPermutationOf(order: readonly string[], source: readonly string[]) {
  return order.length === source.length && [...order].sort().join() === [...source].sort().join();
}

describe("shuffle", () => {
  it("returns a permutation without mutating the input", () => {
    const input = [...ids];
    const output = shuffle(input, seeded(7));

    assert.deepEqual(input, ids, "input must not be mutated");
    assert.ok(isPermutationOf(output, ids));
  });
});

describe("pickOrder", () => {
  it("returns an empty list for no photos", () => {
    assert.deepEqual(pickOrder([], null), []);
  });

  it("returns the only arrangement for a single photo", () => {
    assert.deepEqual(pickOrder(["only"], null), ["only"]);
    assert.deepEqual(pickOrder(["only"], ["only"]), ["only"]);
  });

  it("never repeats the previous order for two photos", () => {
    for (let run = 0; run < 200; run += 1) {
      assert.notDeepEqual(pickOrder(["a", "b"], ["b", "a"], seeded(run)), ["b", "a"]);
      assert.notDeepEqual(pickOrder(["a", "b"], ["a", "b"], seeded(run)), ["a", "b"]);
    }
  });

  it("never repeats the previous order across many runs", () => {
    const previous = [...ids];
    const firsts = new Set<string>();

    for (let run = 0; run < 2000; run += 1) {
      const order = pickOrder(ids, previous, seeded(run));

      assert.ok(isPermutationOf(order, ids));
      assert.ok(!isSameOrder(order, previous), `run ${run} repeated the previous order`);
      assert.notEqual(order[0], previous[0], `run ${run} repeated the previous first photo`);
      firsts.add(order[0]);
    }

    assert.ok(firsts.size > 1, "first photo should vary between visits");
  });

  it("still avoids a repeat when the shuffle keeps landing on the previous order", () => {
    const random: RandomSource = () => 0;
    const first = pickOrder(ids, null, random);
    const second = pickOrder(ids, first, random);

    assert.ok(isPermutationOf(second, ids));
    assert.ok(!isSameOrder(second, first));
  });

  it("survives a photo being removed since the last visit", () => {
    const previous = [...ids];
    const remaining = ids.slice(0, 5);

    for (let run = 0; run < 100; run += 1) {
      assert.ok(isPermutationOf(pickOrder(remaining, previous, seeded(run)), remaining));
    }
  });

  it("survives a new photo being added since the last visit", () => {
    const previous = ["a", "b", "c"];
    const withNew = [...ids];

    for (let run = 0; run < 100; run += 1) {
      assert.ok(isPermutationOf(pickOrder(withNew, previous, seeded(run)), withNew));
    }
  });

  it("ignores unknown ids in a stale previous order", () => {
    assert.ok(isPermutationOf(pickOrder(["a", "b"], ["x", "y", "z"], seeded(3)), ["a", "b"]));
  });
});

describe("isSameOrder", () => {
  it("compares position by position", () => {
    assert.ok(isSameOrder(["a", "b"], ["a", "b"]));
    assert.ok(!isSameOrder(["a", "b"], ["b", "a"]));
    assert.ok(!isSameOrder(["a"], ["a", "b"]));
  });
});
