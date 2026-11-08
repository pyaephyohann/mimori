import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_UPLOAD_KIND,
  MAX_PHOTO_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  normalizePhotoTitle,
  normalizeUploadKind,
  validatePhotoTitleEdit,
  normalizeUploadMime,
  sanitizeFileName,
  sniffImageMime,
  uploadSizeError,
} from "./photo-upload.ts";

const bytesOf = (...values: number[]) => new Uint8Array(values);

const jpeg = bytesOf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const png = bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
const webp = bytesOf(
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
);
const avif = bytesOf(
  0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
);

describe("validatePhotoTitleEdit", () => {
  it("trims and collapses the title", () => {
    assert.deepEqual(validatePhotoTitleEdit("  Our   day "), {
      ok: true,
      title: "Our day",
    });
  });

  it("refuses an empty or whitespace-only title", () => {
    assert.equal(validatePhotoTitleEdit("   ").ok, false);
    assert.equal(validatePhotoTitleEdit("").ok, false);
    assert.equal(validatePhotoTitleEdit(undefined).ok, false);
  });

  it("refuses a title over the maximum length", () => {
    assert.equal(
      validatePhotoTitleEdit("a".repeat(MAX_PHOTO_TITLE_LENGTH + 1)).ok,
      false,
    );
    assert.equal(
      validatePhotoTitleEdit("a".repeat(MAX_PHOTO_TITLE_LENGTH)).ok,
      true,
    );
  });
});

describe("normalizeUploadMime", () => {
  it("accepts the four supported image types", () => {
    assert.equal(normalizeUploadMime("image/jpeg"), "image/jpeg");
    assert.equal(normalizeUploadMime("image/png"), "image/png");
    assert.equal(normalizeUploadMime("image/webp"), "image/webp");
    assert.equal(normalizeUploadMime("image/avif"), "image/avif");
  });

  it("tolerates case, parameters and the old jpg alias", () => {
    assert.equal(normalizeUploadMime("IMAGE/PNG"), "image/png");
    assert.equal(normalizeUploadMime("image/webp; charset=binary"), "image/webp");
    assert.equal(normalizeUploadMime("image/jpg"), "image/jpeg");
  });

  it("rejects unsupported or missing types", () => {
    assert.equal(normalizeUploadMime("image/gif"), null);
    assert.equal(normalizeUploadMime("image/svg+xml"), null);
    assert.equal(normalizeUploadMime("application/pdf"), null);
    assert.equal(normalizeUploadMime(""), null);
    assert.equal(normalizeUploadMime(undefined), null);
  });
});

describe("normalizeUploadKind", () => {
  it("defaults an upload that never mentions a kind to the gallery", () => {
    assert.equal(normalizeUploadKind(undefined), "GALLERY");
    assert.equal(normalizeUploadKind(null), "GALLERY");
    assert.equal(normalizeUploadKind(""), "GALLERY");
    assert.equal(DEFAULT_UPLOAD_KIND, "GALLERY");
  });

  it("accepts exactly the two stored kinds", () => {
    assert.equal(normalizeUploadKind("GALLERY"), "GALLERY");
    assert.equal(normalizeUploadKind("PHOTO_BOOTH"), "PHOTO_BOOTH");
    assert.equal(normalizeUploadKind(" photo_booth "), "PHOTO_BOOTH");
    assert.equal(normalizeUploadKind("gallery"), "GALLERY");
  });

  it("refuses any other kind", () => {
    assert.equal(normalizeUploadKind("PHOTO"), null);
    assert.equal(normalizeUploadKind("GALLERY,PHOTO_BOOTH"), null);
    assert.equal(normalizeUploadKind("admin"), null);
    assert.equal(normalizeUploadKind(4), null);
  });
});

describe("uploadSizeError", () => {
  it("accepts a photo at the limit", () => {
    assert.equal(uploadSizeError(MAX_UPLOAD_BYTES), null);
    assert.equal(uploadSizeError(1), null);
  });

  it("rejects empty and oversized files", () => {
    assert.match(uploadSizeError(0) ?? "", /empty/);
    assert.match(uploadSizeError(MAX_UPLOAD_BYTES + 1) ?? "", /larger than 10 MB/);
    assert.match(uploadSizeError(Number.NaN) ?? "", /empty/);
  });
});

describe("sniffImageMime", () => {
  it("recognises jpeg, png, webp and avif from their bytes", () => {
    assert.equal(sniffImageMime(jpeg), "image/jpeg");
    assert.equal(sniffImageMime(png), "image/png");
    assert.equal(sniffImageMime(webp), "image/webp");
    assert.equal(sniffImageMime(avif), "image/avif");
  });

  it("rejects a GIF, an SVG and plain text claiming to be an image", () => {
    assert.equal(sniffImageMime(bytesOf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), null);
    assert.equal(sniffImageMime(new TextEncoder().encode("<svg></svg>")), null);
    assert.equal(sniffImageMime(new TextEncoder().encode("not an image")), null);
    assert.equal(sniffImageMime(new Uint8Array()), null);
  });
});

describe("normalizePhotoTitle", () => {
  it("treats a missing, blank or non-text title as no title", () => {
    assert.equal(normalizePhotoTitle(undefined), null);
    assert.equal(normalizePhotoTitle(null), null);
    assert.equal(normalizePhotoTitle(""), null);
    assert.equal(normalizePhotoTitle("   \t "), null);
    assert.equal(normalizePhotoTitle(new File(["x"], "x.jpg")), null);
  });

  it("keeps a title and tidies its whitespace and control characters", () => {
    assert.equal(normalizePhotoTitle("  Our   first\ttrip "), "Our first trip");
    assert.equal(normalizePhotoTitle("Beach\u0000day"), "Beach day");
  });
});

describe("sanitizeFileName", () => {
  it("drops directories and control characters", () => {
    assert.equal(sanitizeFileName("/tmp/photos/IMG_0001.jpg"), "IMG_0001.jpg");
    assert.equal(sanitizeFileName("C:\\photos\\IMG_0001.jpg"), "IMG_0001.jpg");
    assert.equal(sanitizeFileName("IMG\u0000_\u001f0001.jpg"), "IMG_0001.jpg");
  });

  it("falls back when nothing usable remains and caps the length", () => {
    assert.equal(sanitizeFileName(""), "photo");
    assert.equal(sanitizeFileName("   "), "photo");
    assert.equal(sanitizeFileName("/tmp/"), "photo");
    assert.equal(sanitizeFileName(`${"a".repeat(400)}.jpg`).length, 200);
  });
});
