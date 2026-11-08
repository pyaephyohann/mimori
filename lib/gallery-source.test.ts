import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GALLERY_PHOTO_KIND,
  readGalleryPhotos,
  toGalleryPhoto,
} from "./gallery-source.ts";

const rows = [
  {
    id: "photo-b",
    secureUrl: "https://res.cloudinary.com/demo/image/upload/b.jpg",
    caption: "  our trip  ",
    fileName: "IMG_B.jpg",
  },
  {
    id: "photo-a",
    secureUrl: "https://res.cloudinary.com/demo/image/upload/a.jpg",
    caption: null,
    fileName: "IMG_A.jpg",
  },
];

describe("GALLERY_PHOTO_KIND", () => {
  it("selects only normal gallery photos, never Photobooth captures or prints", () => {
    assert.equal(GALLERY_PHOTO_KIND, "GALLERY");
    assert.notEqual(GALLERY_PHOTO_KIND, "PHOTO_BOOTH");
  });
});

describe("toGalleryPhoto", () => {
  it("trims the caption and uses it as alt text", () => {
    assert.deepEqual(toGalleryPhoto(rows[0]), {
      id: "photo-b",
      src: "https://res.cloudinary.com/demo/image/upload/b.jpg",
      caption: "our trip",
      alt: "our trip",
    });
  });

  it("never invents a title for a photo without one", () => {
    assert.deepEqual(toGalleryPhoto(rows[1]), {
      id: "photo-a",
      src: "https://res.cloudinary.com/demo/image/upload/a.jpg",
      caption: "",
      alt: "IMG_A.jpg",
    });
  });
});

describe("readGalleryPhotos", () => {
  it("returns database photos in the order the query gave", async () => {
    const result = await readGalleryPhotos(async () => rows);

    assert.equal(result.failed, false);
    assert.deepEqual(
      result.photos.map((photo) => photo.id),
      ["photo-b", "photo-a"],
    );
    assert.equal(result.photos[0]?.caption, "our trip");
  });

  it("returns an empty, successful result — no bundled photos — for an empty table", async () => {
    const result = await readGalleryPhotos(async () => []);

    assert.deepEqual(result.photos, []);
    assert.equal(result.failed, false);
  });

  it("reports a failed query as a failure with no photos", async () => {
    const seen: unknown[] = [];
    const error = new Error("connection refused");

    const result = await readGalleryPhotos(
      async () => {
        throw error;
      },
      (cause) => seen.push(cause),
    );

    assert.deepEqual(result.photos, []);
    assert.equal(result.failed, true);
    assert.deepEqual(seen, [error]);
  });
});
