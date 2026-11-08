import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readDestroyOutcome } from "./cloudinary-result.ts";

describe("readDestroyOutcome", () => {
  it("reports a destroyed asset", () => {
    assert.deepEqual(readDestroyOutcome(200, { result: "ok" }), {
      ok: true,
      alreadyMissing: false,
    });
  });

  it("treats an asset Cloudinary no longer has as safely gone", () => {
    assert.deepEqual(readDestroyOutcome(200, { result: "not found" }), {
      ok: true,
      alreadyMissing: true,
    });
  });

  it("reports a refused request as a failure, not a deletion", () => {
    const result = readDestroyOutcome(401, { error: { message: "Invalid Signature" } });

    assert.equal(result.ok, false);
  });

  it("reports an unknown result instead of claiming success", () => {
    const result = readDestroyOutcome(200, { result: "error" });

    assert.deepEqual(result, { ok: false, error: "error" });
  });

  it("reports a malformed or empty body as a failure", () => {
    assert.deepEqual(readDestroyOutcome(200, null), {
      ok: false,
      error: "unexpected response",
    });
    assert.deepEqual(readDestroyOutcome(200, {}), {
      ok: false,
      error: "unexpected response",
    });
    assert.deepEqual(readDestroyOutcome(500, null), {
      ok: false,
      error: "status 500",
    });
  });
});
