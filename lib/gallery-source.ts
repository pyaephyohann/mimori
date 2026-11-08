import type { Photo } from "./photo.ts";

/**
 * Turns `Photo` rows into what the gallery renders.
 *
 * The database is the only image source: a successful query that returns no
 * rows is an empty gallery, and a failed query is an error. Neither state falls
 * back to bundled pictures, because Mimori no longer has any.
 *
 * Kept free of Prisma and `server-only` imports so both states can be covered
 * by plain `node:test` (see `gallery-source.test.ts`).
 */

/**
 * The `Photo` kind the gallery shows. Photobooth captures and prints are
 * `PHOTO_BOOTH` rows and must never reach the Gallery, so every gallery query
 * filters on this value in the database.
 */
export const GALLERY_PHOTO_KIND = "GALLERY" as const;

/** The columns the gallery needs from a `Photo` row. */
export type GalleryPhotoRow = {
  id: string;
  secureUrl: string;
  caption: string | null;
  fileName: string | null;
};

export type GalleryPhotos = {
  photos: readonly Photo[];
  /** True when the query failed — distinct from a genuinely empty table. */
  failed: boolean;
};

/** Longest caption-like string taken from a filename. */
const MAX_TITLE_LENGTH = 80;

/**
 * A database photo, shaped for the gallery, the viewer, the collections
 * pickers and the polaroid frame.
 */
export function toGalleryPhoto(row: GalleryPhotoRow): Photo {
  // A photo may have no caption. It renders no title line rather than an
  // invented one.
  const caption = (row.caption ?? "").trim();

  const fallbackAlt =
    row.fileName?.trim().slice(0, MAX_TITLE_LENGTH) || "A photo of us";

  return {
    id: row.id,
    src: row.secureUrl,
    caption,
    alt: caption || fallbackAlt,
  };
}

export async function readGalleryPhotos(
  read: () => Promise<readonly GalleryPhotoRow[]>,
  onFailure: (error: unknown) => void = () => {},
): Promise<GalleryPhotos> {
  try {
    const rows = await read();

    // Zero rows is an empty gallery, not a failure — but it is still no
    // pictures. The UI shows its empty state.
    return { photos: rows.map(toGalleryPhoto), failed: false };
  } catch (error) {
    // A failed query must never be reported as an empty gallery, and must
    // never be dressed up with bundled photos.
    onFailure(error);

    return { photos: [], failed: true };
  }
}
