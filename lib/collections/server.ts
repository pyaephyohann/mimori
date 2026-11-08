import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { getPrisma } from "../db";
import { loadPhotoIdSet } from "../gallery-photos";
import type { Collection } from "./catalog.ts";
import type {
  CollectionDraft,
  CollectionPatch,
  MoveRequest,
} from "./validate.ts";

/**
 * Collection persistence.
 *
 * A collection is the existing `Folder` model — one concept, one table — and
 * its photos live in `CollectionPhoto` as gallery `Photo` ids. The photo record
 * stays the single record for each image, so adding a photo to a collection
 * never uploads or duplicates anything, and removing one only deletes the
 * membership row.
 *
 * Membership is filtered against the photo table on every read, so a photo
 * that no longer exists disappears from the collection instead of rendering as
 * a broken image.
 */

export class CollectionNameTakenError extends Error {
  constructor() {
    super("A collection with that name already exists.");
    this.name = "CollectionNameTakenError";
  }
}

export class CollectionNotFoundError extends Error {
  constructor() {
    super("That collection no longer exists.");
    this.name = "CollectionNotFoundError";
  }
}

type FolderRow = {
  id: string;
  name: string;
  description: string | null;
  pinned: boolean;
  coverPhotoId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: { photoId: string }[];
};

const withItems = {
  items: {
    orderBy: [{ position: "asc" }, { photoId: "asc" }],
    select: { photoId: true },
  },
} satisfies Prisma.FolderInclude;

function toCollection(
  row: FolderRow,
  allowedPhotoIds: ReadonlySet<string>,
): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pinned: row.pinned,
    // A cover that is no longer in the gallery is dropped rather than shown
    // as a broken image; the card falls back to the first photo.
    coverPhotoId:
      row.coverPhotoId && allowedPhotoIds.has(row.coverPhotoId)
        ? row.coverPhotoId
        : null,
    photoIds: row.items
      .map((item) => item.photoId)
      .filter((photoId) => allowedPhotoIds.has(photoId)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function listCollections(): Promise<Collection[]> {
  const [rows, allowedPhotoIds] = await Promise.all([
    getPrisma().folder.findMany({
      include: withItems,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    }),
    loadPhotoIdSet(),
  ]);

  return rows.map((row) => toCollection(row, allowedPhotoIds));
}

export async function getCollection(id: string): Promise<Collection | null> {
  const [row, allowedPhotoIds] = await Promise.all([
    getPrisma().folder.findUnique({
      where: { id },
      include: withItems,
    }),
    loadPhotoIdSet(),
  ]);

  return row ? toCollection(row, allowedPhotoIds) : null;
}

export async function createCollection(
  draft: CollectionDraft,
): Promise<Collection> {
  try {
    const row = await getPrisma().folder.create({
      data: {
        name: draft.name,
        description: draft.description,
        coverPhotoId: draft.coverPhotoId,
        items: {
          create: draft.photoIds.map((photoId, position) => ({
            photoId,
            position,
          })),
        },
      },
      include: withItems,
    });

    return toCollection(row, await loadPhotoIdSet());
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CollectionNameTakenError();
    }

    throw error;
  }
}

export async function updateCollection(
  id: string,
  patch: CollectionPatch,
): Promise<Collection | null> {
  try {
    const row = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.folder.findUnique({ where: { id } });

      if (!existing) {
        return null;
      }

      const data: {
        name?: string;
        description?: string | null;
        pinned?: boolean;
        coverPhotoId?: string | null;
      } = {};

      if (patch.name !== undefined) {
        data.name = patch.name;
      }

      if (patch.description !== undefined) {
        data.description = patch.description;
      }

      if (patch.pinned !== undefined) {
        data.pinned = patch.pinned;
      }

      if (patch.coverPhotoId !== undefined) {
        data.coverPhotoId = patch.coverPhotoId;
      }

      if (Object.keys(data).length > 0) {
        await tx.folder.update({ where: { id }, data });
      }

      if (patch.photoIds !== undefined) {
        // Whole-list replacement keeps display order explicit.
        await tx.collectionPhoto.deleteMany({ where: { folderId: id } });

        if (patch.photoIds.length > 0) {
          await tx.collectionPhoto.createMany({
            data: patch.photoIds.map((photoId, position) => ({
              folderId: id,
              photoId,
              position,
            })),
          });
        }
      } else {
        if (patch.removePhotoIds && patch.removePhotoIds.length > 0) {
          await tx.collectionPhoto.deleteMany({
            where: { folderId: id, photoId: { in: patch.removePhotoIds } },
          });
        }

        if (patch.addPhotoIds && patch.addPhotoIds.length > 0) {
          const current = await tx.collectionPhoto.findMany({
            where: { folderId: id },
            select: { photoId: true, position: true },
          });
          const present = new Set(current.map((item) => item.photoId));
          let next =
            current.reduce((highest, item) => Math.max(highest, item.position), -1) +
            1;

          const additions = patch.addPhotoIds
            .filter((photoId) => !present.has(photoId))
            .map((photoId) => ({
              folderId: id,
              photoId,
              position: next++,
            }));

          if (additions.length > 0) {
            await tx.collectionPhoto.createMany({
              data: additions,
              skipDuplicates: true,
            });
          }
        }
      }

      return tx.folder.findUnique({
        where: { id },
        include: withItems,
      });
    });

    return row ? toCollection(row, await loadPhotoIdSet()) : null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CollectionNameTakenError();
    }

    throw error;
  }
}

/** Removes the collection and its membership rows. Gallery photos are
 *  `Photo` records and are never touched. */
export async function deleteCollection(id: string): Promise<boolean> {
  const existing = await getPrisma().folder.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await getPrisma().folder.delete({ where: { id } });

  return true;
}

export type MoveResult = {
  from: Collection | null;
  to: Collection | null;
};

/**
 * Moves photos between collections (or into/out of no collection at all).
 *
 * One transaction, so a failure cannot leave a photo removed from its old
 * collection without arriving in the new one. The photo itself is unchanged.
 */
export async function movePhotos(request: MoveRequest): Promise<MoveResult> {
  const { fromId, toId, photoIds } = request;
  const allowedPhotoIds = await loadPhotoIdSet();

  return getPrisma().$transaction(async (tx) => {
    if (fromId) {
      const source = await tx.folder.findUnique({
        where: { id: fromId },
        select: { id: true },
      });

      if (!source) {
        throw new CollectionNotFoundError();
      }

      await tx.collectionPhoto.deleteMany({
        where: { folderId: fromId, photoId: { in: photoIds } },
      });
    }

    if (toId) {
      const target = await tx.folder.findUnique({
        where: { id: toId },
        select: { id: true },
      });

      if (!target) {
        throw new CollectionNotFoundError();
      }

      const current = await tx.collectionPhoto.findMany({
        where: { folderId: toId },
        select: { photoId: true, position: true },
      });
      const present = new Set(current.map((item) => item.photoId));
      let next =
        current.reduce((highest, item) => Math.max(highest, item.position), -1) + 1;

      const additions = photoIds
        .filter((photoId) => !present.has(photoId))
        .map((photoId) => ({ folderId: toId, photoId, position: next++ }));

      if (additions.length > 0) {
        await tx.collectionPhoto.createMany({
          data: additions,
          skipDuplicates: true,
        });
      }
    }

    const read = async (id: string | null): Promise<Collection | null> => {
      if (!id) {
        return null;
      }

      const row = await tx.folder.findUnique({
        where: { id },
        include: withItems,
      });

      return row ? toCollection(row, allowedPhotoIds) : null;
    };

    return { from: await read(fromId), to: await read(toId) };
  });
}
