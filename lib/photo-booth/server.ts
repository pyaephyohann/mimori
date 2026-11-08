import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { deleteImage } from "@/lib/cloudinary";
import { getPrisma } from "@/lib/db";
import { HERO_ROW_TYPE } from "@/lib/hero/server";
import { parseHeroAssignments } from "@/lib/hero/slots";

import {
  validateSessionPhotos,
  type BoothSessionInput,
  type BoothUpdateInput,
} from "./session";
import type { BoothSessionSummary } from "./summary";

/**
 * Reading and writing saved photobooth sessions.
 *
 * A session only references photos: its captures and its finished print are all
 * `PHOTO_BOOTH` rows, so the Gallery (which lists only `GALLERY` photos) never
 * shows anything a Photo Booth session made. The database links decide which
 * row is a capture and which is a print, not the kind.
 *
 * Editing a saved print replaces that one `PHOTO_BOOTH` row. The old print is only
 * removed once the session points at the new one and nothing else (another
 * session, a collection, a widget, a hero slot or a folder cover) still uses it;
 * captures are never deleted by an edit.
 */

/** A referenced photo is missing or has the wrong kind. */
export class BoothPhotoError extends Error {}

/** One of the captures already belongs to a saved session. */
export class BoothDuplicateError extends Error {}

/** The session does not exist. */
export class BoothNotFoundError extends Error {}

/** Only the fields the UI needs; no Cloudinary metadata leaks out. */
const photoRef = { id: true, secureUrl: true } as const;

const sessionSummarySelect = {
  id: true,
  createdAt: true,
  photoCount: true,
  layout: true,
  borderKey: true,
  caption: true,
  printDate: true,
  printPhoto: { select: photoRef },
  _count: { select: { shots: true } },
  shots: {
    orderBy: { position: "asc" },
    select: { photo: { select: photoRef } },
  },
} as const;

/** The library's row shape; see `lib/photo-booth/summary.ts`. */
export type SavedBoothSessionSummary = BoothSessionSummary;

type SessionSummaryRow = {
  id: string;
  createdAt: Date;
  photoCount: number;
  layout: string;
  borderKey: string;
  caption: string | null;
  printDate: string | null;
  printPhoto: { id: string; secureUrl: string };
  _count: { shots: number };
  shots: { photo: { id: string; secureUrl: string } }[];
};

function toSummary(row: SessionSummaryRow): SavedBoothSessionSummary {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    photoCount: row.photoCount,
    layout: row.layout,
    borderKey: row.borderKey,
    caption: row.caption ?? "",
    printDate: row.printDate,
    print: { id: row.printPhoto.id, src: row.printPhoto.secureUrl },
    shotCount: row._count.shots,
    shotThumbs: row.shots.map((shot) => ({
      id: shot.photo.id,
      src: shot.photo.secureUrl,
    })),
  };
}

/**
 * Saves a session after checking every referenced row.
 *
 * The checks run before the write so a malformed request cannot leave a
 * half-described session behind; the insert itself is one nested create, which
 * Postgres runs in a single transaction with its shots.
 */
export async function createBoothSession(
  input: BoothSessionInput,
): Promise<SavedBoothSessionSummary> {
  const prisma = getPrisma();
  const ids = [...input.shotPhotoIds, input.printPhotoId];

  const rows = await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, kind: true },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));

  const shots = input.shotPhotoIds.map((id) => {
    const row = byId.get(id);

    return row ? { id: row.id, kind: row.kind } : null;
  });

  const printRow = byId.get(input.printPhotoId);
  const problem = validateSessionPhotos(
    shots,
    printRow ? { id: printRow.id, kind: printRow.kind } : null,
    input.photoCount,
  );

  if (problem) {
    throw new BoothPhotoError(problem);
  }

  // A capture belongs to exactly one session (the schema's unique `photoId`
  // enforces it too); checking first turns a constraint error into a sentence.
  const reused = await prisma.photoboothShot.findFirst({
    where: { photoId: { in: input.shotPhotoIds } },
    select: { id: true },
  });

  if (reused) {
    throw new BoothDuplicateError(
      "Those photos are already part of a saved photobooth.",
    );
  }

  // Both kinds are `PHOTO_BOOTH`, so the kind cannot tell a capture from a
  // print: a print must not be another session's capture, and a capture must
  // not be another session's print.
  const [printUsedAsShot, shotUsedAsPrint] = await Promise.all([
    prisma.photoboothShot.findFirst({
      where: { photoId: input.printPhotoId },
      select: { id: true },
    }),
    prisma.photoboothSession.findFirst({
      where: { printPhotoId: { in: input.shotPhotoIds } },
      select: { id: true },
    }),
  ]);

  if (printUsedAsShot || shotUsedAsPrint) {
    throw new BoothPhotoError(
      "Those photos already belong to a different part of a photobooth.",
    );
  }

  const row = await prisma.photoboothSession.create({
    data: {
      photoCount: input.photoCount,
      layout: input.layout,
      borderKey: input.borderKey,
      backgroundKey: input.backgroundKey,
      caption: input.caption.length > 0 ? input.caption : null,
      showDate: input.showDate,
      printDate: input.printDate,
      spacing: input.spacing,
      borderWidth: input.borderWidth,
      // Validated by `parseBoothSessionInput`; the column is JSON, not a blob of
      // arbitrary client data.
      stickers: input.stickers as unknown as Prisma.InputJsonValue,
      printPhotoId: input.printPhotoId,
      shots: {
        create: input.shotPhotoIds.map((photoId, position) => ({
          photoId,
          position,
        })),
      },
    },
    select: sessionSummarySelect,
  });

  return toSummary(row);
}

/** Every saved session, newest first, as metadata only. */
export async function listBoothSessions(): Promise<SavedBoothSessionSummary[]> {
  const rows = await getPrisma().photoboothSession.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: sessionSummarySelect,
  });

  return rows.map(toSummary);
}

export type SavedBoothSessionDetail = SavedBoothSessionSummary & {
  backgroundKey: string | null;
  showDate: boolean;
  printDate: string | null;
  spacing: number;
  borderWidth: number;
  /** Stored sticker placements, as written by the editor. */
  stickers: unknown;
  /** Captures in print order. */
  shots: { position: number; photo: { id: string; src: string } }[];
};

/** One session with its settings, its ordered captures and its print. */
export async function getBoothSession(
  id: string,
): Promise<SavedBoothSessionDetail | null> {
  if (!id) {
    return null;
  }

  const row = await getPrisma().photoboothSession.findUnique({
    where: { id },
    select: {
      ...sessionSummarySelect,
      backgroundKey: true,
      showDate: true,
      printDate: true,
      spacing: true,
      borderWidth: true,
      stickers: true,
      shots: {
        orderBy: { position: "asc" },
        select: { position: true, photo: { select: photoRef } },
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    ...toSummary(row),
    backgroundKey: row.backgroundKey,
    showDate: row.showDate,
    printDate: row.printDate,
    spacing: row.spacing,
    borderWidth: row.borderWidth,
    stickers: row.stickers,
    shots: row.shots.map((shot) => ({
      position: shot.position,
      photo: { id: shot.photo.id, src: shot.photo.secureUrl },
    })),
  };
}

/**
 * Whether the replaced print is safe to remove.
 *
 * A print is just a gallery photo, so the visitor may have pinned it in a
 * collection, put it in a widget, chosen it for a hero slot or made it a
 * folder's cover. Any of those means the row is no longer only this session's
 * to delete, and the safe answer is to leave it where it is.
 */
async function isPrintUnreferenced(
  photoId: string,
  sessionId: string,
): Promise<boolean> {
  const prisma = getPrisma();

  const [otherSession, collection, widgetItem, cover, hero] = await Promise.all([
    prisma.photoboothSession.findFirst({
      where: { printPhotoId: photoId, id: { not: sessionId } },
      select: { id: true },
    }),
    prisma.collectionPhoto.findFirst({
      where: { photoId },
      select: { folderId: true },
    }),
    prisma.widgetPhoto.findFirst({
      where: { photoId },
      select: { widgetId: true },
    }),
    prisma.folder.findFirst({
      where: { coverPhotoId: photoId },
      select: { id: true },
    }),
    prisma.widget.findFirst({
      where: { type: HERO_ROW_TYPE },
      select: { config: true },
    }),
  ]);

  const inHero = parseHeroAssignments(hero?.config).some(
    (assignment) => assignment.photoId === photoId,
  );

  return !otherSession && !collection && !widgetItem && !cover && !inHero;
}

/**
 * Removes the print an edit has just replaced, once the new one is committed.
 *
 * Runs after the session already points at the replacement, so a failure here
 * can never leave a session without a print: the old photo simply stays in the
 * photo stays where it is (and the asset in Cloudinary, logged) instead of being deleted
 * unsafely. The captures are never touched — only the finished page is replaced.
 */
async function discardReplacedPrint(
  oldPrint: { id: string; publicId: string } | null,
  nextPrintId: string,
  sessionId: string,
): Promise<void> {
  if (!oldPrint || oldPrint.id === nextPrintId) {
    return;
  }

  try {
    if (!(await isPrintUnreferenced(oldPrint.id, sessionId))) {
      return;
    }

    await getPrisma().photo.delete({ where: { id: oldPrint.id } });
  } catch (error) {
    console.error("A replaced photobooth print could not be removed", error);

    return;
  }

  // The row is gone, so its asset is unreachable from the app; the delete is
  // best-effort and never throws.
  await deleteImage(oldPrint.publicId);
}

/**
 * Saves an edit to an existing session.
 *
 * The captures, their order and the print's shape are read from the row itself:
 * a client cannot rename them, swap one out, or attach someone else's photo.
 * The new print must be a `PHOTO_BOOTH` photo, and the stored captures are
 * checked again so a session whose originals disappeared fails loudly instead
 * of being updated with missing photos. One update statement writes every
 * setting and the new print together; the replaced print is only removed once
 * that write has succeeded.
 */
export async function updateBoothSession(
  id: string,
  input: BoothUpdateInput,
): Promise<SavedBoothSessionSummary> {
  const prisma = getPrisma();

  if (!id) {
    throw new BoothNotFoundError();
  }

  const session = await prisma.photoboothSession.findUnique({
    where: { id },
    select: {
      id: true,
      photoCount: true,
      printPhoto: { select: { id: true, publicId: true } },
      shots: {
        orderBy: [{ position: "asc" }],
        select: {
          photoId: true,
          photo: { select: { id: true, kind: true } },
        },
      },
    },
  });

  if (!session) {
    throw new BoothNotFoundError();
  }

  const print = await prisma.photo.findUnique({
    where: { id: input.printPhotoId },
    select: { id: true, kind: true },
  });

  const problem = validateSessionPhotos(
    session.shots.map((shot) => ({
      id: shot.photo.id,
      kind: shot.photo.kind,
    })),
    print ? { id: print.id, kind: print.kind } : null,
    session.photoCount,
  );

  if (problem) {
    throw new BoothPhotoError(problem);
  }

  if (session.shots.some((shot) => shot.photoId === input.printPhotoId)) {
    throw new BoothPhotoError(
      "The finished print cannot also be one of its photos.",
    );
  }

  // A print belongs to one booth, and it cannot be another booth's capture.
  // Both kinds are `PHOTO_BOOTH`, so these database links are the only guard.
  const [captureOfAnother, otherSession] = await Promise.all([
    prisma.photoboothShot.findFirst({
      where: { photoId: input.printPhotoId },
      select: { id: true },
    }),
    prisma.photoboothSession.findFirst({
      where: { printPhotoId: input.printPhotoId, id: { not: id } },
      select: { id: true },
    }),
  ]);

  if (captureOfAnother) {
    throw new BoothPhotoError("That print is already one of another booth's photos.");
  }

  if (otherSession) {
    throw new BoothPhotoError("That print already belongs to another booth.");
  }

  const row = await prisma.photoboothSession.update({
    where: { id },
    data: {
      borderKey: input.borderKey,
      backgroundKey: input.backgroundKey,
      caption: input.caption.length > 0 ? input.caption : null,
      showDate: input.showDate,
      printDate: input.printDate,
      spacing: input.spacing,
      borderWidth: input.borderWidth,
      stickers: input.stickers as unknown as Prisma.InputJsonValue,
      printPhotoId: input.printPhotoId,
    },
    select: sessionSummarySelect,
  });

  await discardReplacedPrint(session.printPhoto, input.printPhotoId, id);

  return toSummary(row);
}
