import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { destroyImage, isCloudinaryConfigured } from "./cloudinary";
import {
  stripPhotoFromHeroConfig,
  stripPhotoFromWidgetConfig,
} from "./gallery-cleanup";
import { GALLERY_PHOTO_KIND } from "./gallery-source";
import { getPrisma } from "./db";
import { HERO_ROW_TYPE } from "./hero/server";

/**
 * Permanently deleting one gallery photo.
 *
 * The `Photo` row and its Cloudinary asset are the two halves of one record, so
 * both go. The database goes first: if the row cannot be removed, the asset is
 * left alone and the picture stays exactly as it was. If the row is removed but
 * Cloudinary refuses, the caller is told the file could not be deleted instead
 * of being given a clean success.
 *
 * The public id is always read from the row, never from the request, so a
 * request cannot name someone else's asset. Only `kind = GALLERY` rows are
 * deletable: a Photo Booth capture or a booth print is never touched, and a
 * print is refused outright because removing it would delete its saved session.
 */

export class GalleryPhotoNotFoundError extends Error {
  constructor() {
    super("That photo is no longer in the gallery.");
    this.name = "GalleryPhotoNotFoundError";
  }
}

export class GalleryPhotoInUseError extends Error {
  constructor() {
    super(
      "This photo is the print of a saved photobooth, so it cannot be deleted here.",
    );
    this.name = "GalleryPhotoInUseError";
  }
}

export class GalleryStorageUnavailableError extends Error {
  constructor() {
    super("Photos cannot be deleted right now, so nothing was removed.");
    this.name = "GalleryStorageUnavailableError";
  }
}

export type GalleryDeletionResult = {
  photoId: string;
  /**
   * Set when the photo is gone from the gallery but its stored file could not
   * be removed. The caller must report this rather than a clean deletion.
   */
  warning: string | null;
};

const ORPHANED_ASSET_WARNING =
  "The photo was removed from your gallery, but its file could not be deleted from storage.";

export async function deleteGalleryPhoto(
  id: string,
): Promise<GalleryDeletionResult> {
  const photo = await getPrisma().photo.findUnique({
    where: { id },
    select: { id: true, kind: true, publicId: true },
  });

  // Wrong kind is reported as "not in the gallery" on purpose: booth captures
  // are not part of this feature, and a print is handled explicitly below.
  if (!photo || photo.kind !== GALLERY_PHOTO_KIND) {
    throw new GalleryPhotoNotFoundError();
  }

  // A print is the session's only link to its captures, so deleting it would
  // cascade the session away and orphan the original shots. Refuse instead.
  const session = await getPrisma().photoboothSession.findFirst({
    where: { printPhotoId: id },
    select: { id: true },
  });

  if (session) {
    throw new GalleryPhotoInUseError();
  }

  // Without storage credentials the file could never be destroyed, so the row
  // is not removed either — nothing is reported as deleted while its asset
  // would be stranded.
  if (!isCloudinaryConfigured()) {
    throw new GalleryStorageUnavailableError();
  }

  await getPrisma().$transaction(async (tx) => {
    // Collection membership has no foreign key, so the rows are removed here.
    // Only this photo's membership goes; the collections themselves stay.
    await tx.collectionPhoto.deleteMany({ where: { photoId: id } });

    // A cover that pointed at the deleted photo falls back to the collection's
    // first remaining photo, which the card already does when the cover is null.
    await tx.folder.updateMany({
      where: { coverPhotoId: id },
      data: { coverPhotoId: null },
    });

    // Widget and carousel references live in JSON, where no foreign key can
    // cascade. Each affected row is rewritten to drop just this photo.
    const widgets = await tx.widget.findMany({
      select: { id: true, type: true, config: true },
    });

    for (const widget of widgets) {
      const next =
        widget.type === HERO_ROW_TYPE
          ? stripPhotoFromHeroConfig(widget.config, id)
          : stripPhotoFromWidgetConfig(widget.config, id);

      if (next === null) {
        continue;
      }

      await tx.widget.update({
        where: { id: widget.id },
        data: { config: next as Prisma.InputJsonValue },
      });
    }

    // `WidgetPhoto` rows cascade from the photo row itself. Deleting by kind as
    // well as id means a booth photo can never be removed through this path.
    const { count } = await tx.photo.deleteMany({
      where: { id, kind: GALLERY_PHOTO_KIND },
    });

    if (count === 0) {
      // Already deleted by a concurrent request; the transaction rolls back.
      throw new GalleryPhotoNotFoundError();
    }
  });

  const destroyed = await destroyImage(photo.publicId);

  return {
    photoId: id,
    warning: destroyed.ok ? null : ORPHANED_ASSET_WARNING,
  };
}
