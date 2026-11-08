import "server-only";

import type { Photo } from "./photo";
import { getPrisma } from "./db";
import {
  GALLERY_PHOTO_KIND,
  readGalleryPhotos,
  toGalleryPhoto,
  type GalleryPhotoRow,
  type GalleryPhotos,
} from "./gallery-source";

/**
 * The gallery's photo source — the only image source in the application.
 *
 * Uploaded photos live in the `Photo` table (metadata only) with the file in
 * Cloudinary. Everything else that needs pictures (hero slots, collections,
 * widgets, Recently Added) reads ids from that table through this module, so
 * there is exactly one definition of "which photos exist".
 */

/** Shared column selection, so every reader maps rows the same way. */
export const galleryPhotoSelect = {
  id: true,
  secureUrl: true,
  caption: true,
  fileName: true,
} as const;

/** Newest first, matching how the gallery has always shown "recently added". */
const NEWEST_FIRST = [{ createdAt: "desc" }, { id: "desc" }] as const;

/**
 * The gallery as the pages and pickers render it.
 *
 * A successful query with no rows means an empty gallery; a failed query sets
 * `failed` so the UI can say so instead of pretending the gallery is empty.
 */
export async function loadGalleryPhotos(): Promise<GalleryPhotos> {
  return readGalleryPhotos(
    async () => {
      const rows: GalleryPhotoRow[] = await getPrisma().photo.findMany({
        where: { kind: GALLERY_PHOTO_KIND },
        orderBy: [...NEWEST_FIRST],
        select: galleryPhotoSelect,
      });

      return rows;
    },
    (error) => {
      console.error("The gallery photo query failed.", error);
    },
  );
}

/** The ids of every gallery photo, for server-side validation. */
export async function loadPhotoIdSet(): Promise<Set<string>> {
  const rows = await getPrisma().photo.findMany({
    where: { kind: GALLERY_PHOTO_KIND },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

/**
 * Gallery photos by id, newest first. Unknown or non-gallery ids are simply
 * absent from the map, so a stale reference renders as an empty slot rather
 * than a broken image.
 */
export async function loadPhotosByIds(
  ids: readonly string[],
): Promise<Map<string, Photo>> {
  const unique = [...new Set(ids.filter((id) => id.trim() !== ""))];

  if (unique.length === 0) {
    return new Map();
  }

  const rows: GalleryPhotoRow[] = await getPrisma().photo.findMany({
    where: { id: { in: unique }, kind: GALLERY_PHOTO_KIND },
    orderBy: [...NEWEST_FIRST],
    select: galleryPhotoSelect,
  });

  return new Map(rows.map((row) => [row.id, toGalleryPhoto(row)]));
}

/** Shape returned to the upload dialog after a photo is stored. */
export type UploadedGalleryPhoto = ReturnType<typeof toGalleryPhoto>;
