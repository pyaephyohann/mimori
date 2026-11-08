import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { widgetUploadFileError } from "./photo-upload-selection.ts";

describe("widgetUploadFileError", () => {
  it("accepts a JPEG, PNG or WebP under the size limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      assert.equal(widgetUploadFileError({ type, size: 1024 }), null);
    }
  });

  it("rejects a non-image type", () => {
    assert.match(
      widgetUploadFileError({ type: "application/pdf", size: 1024 }) ?? "",
      /Only JPEG/,
    );
  });

  it("rejects an empty or oversized file", () => {
    assert.equal(
      widgetUploadFileError({ type: "image/png", size: 0 }),
      "That file is empty.",
    );
    assert.match(
      widgetUploadFileError({ type: "image/png", size: 11 * 1024 * 1024 }) ?? "",
      /larger than 10 MB/,
    );
  });
});
