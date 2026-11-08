/**
 * Turning `GET /api/photo-booth/[id]` into editor state.
 *
 * Opening a saved session must not need the camera and must not touch the
 * database: every photograph it was made from is already a `Photo` row with a
 * Cloudinary URL, and every setting is a column. This module checks that the
 * payload is complete and coherent, then hands back the same `photoCount`,
 * `layout`, `BoothEditorConfig` and shot list the camera flow produces — so the
 * editor cannot tell a reopened session from a fresh one.
 *
 * Pure on purpose (no React, no Prisma, no DOM) so the rules can be tested, and
 * strict on purpose: a capture whose row was deleted, or a paper key that no
 * longer exists, is reported rather than silently swapped for a default.
 */

import {
  isBoothLayout,
  isPhotoCount,
  type BoothLayout,
  type PhotoCount,
} from "./catalog.ts";
import { toDateValue, type BoothEditorConfig } from "./editor.ts";
import { parseBoothSettings } from "./session.ts";
import { savedShot, type BoothShot } from "./shots.ts";
import type { BoothSessionSummary } from "./summary.ts";

export type SavedSessionPayload = {
  id: string;
  createdAt: string;
  photoCount: unknown;
  layout: unknown;
  borderKey: unknown;
  backgroundKey: unknown;
  caption: unknown;
  showDate: unknown;
  printDate: unknown;
  spacing: unknown;
  borderWidth: unknown;
  stickers: unknown;
  print: { id: string; src: string } | null;
  /** Captures with their stored position, in whatever order the API sent. */
  shots: readonly {
    position: number;
    photo: { id: string; src: string } | null;
  }[];
};

export type RestoredBooth = {
  sessionId: string;
  photoCount: PhotoCount;
  layout: BoothLayout;
  config: BoothEditorConfig;
  /** The original captures, in print order, as Cloudinary images. */
  shots: BoothShot[];
  print: { id: string; src: string };
  /** Exactly what the library card shows, built from the validated session. */
  summary: BoothSessionSummary;
};

export type RestoreBoothResult =
  | { ok: true; value: RestoredBooth }
  | { ok: false; error: string };

const UNREADABLE = "That saved photobooth could not be read. Try opening another one.";

const MISSING_PHOTOS =
  "Some of this print's original photos are missing, so it cannot be edited. The saved print is still in your Photo Booth.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPhoto(value: unknown): value is { id: string; src: string } {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.src === "string" &&
    value.src.length > 0
  );
}

/**
 * Validates a session payload and builds the editor's starting state.
 *
 * `null`/`undefined` payloads (a 404 body, a truncated response) and malformed
 * settings all fail with the same sentence: there is nothing useful to show for
 * a session that cannot be described.
 */
export function restoreBoothSession(
  payload: unknown,
): RestoreBoothResult {
  if (!isRecord(payload)) {
    return { ok: false, error: UNREADABLE };
  }

  const session = payload as unknown as SavedSessionPayload;

  if (typeof session.id !== "string" || session.id.length === 0) {
    return { ok: false, error: UNREADABLE };
  }

  if (typeof session.createdAt !== "string" || session.createdAt.length === 0) {
    return { ok: false, error: UNREADABLE };
  }

  if (!isPhotoCount(session.photoCount) || !isBoothLayout(session.layout)) {
    return { ok: false, error: UNREADABLE };
  }

  if (!isPhoto(session.print)) {
    return { ok: false, error: UNREADABLE };
  }

  const settings = parseBoothSettings({
    borderKey: session.borderKey,
    backgroundKey: session.backgroundKey ?? null,
    caption: session.caption ?? "",
    showDate: session.showDate,
    printDate: session.printDate ?? null,
    spacing: session.spacing,
    borderWidth: session.borderWidth,
    stickers: session.stickers ?? [],
  });

  if (!settings.ok) {
    return { ok: false, error: UNREADABLE };
  }

  if (!Array.isArray(session.shots)) {
    return { ok: false, error: MISSING_PHOTOS };
  }

  // Sorted defensively: a malformed entry must reach the checks below rather
  // than throw from the comparator.
  const positionOf = (shot: unknown): number =>
    isRecord(shot) && typeof shot.position === "number" ? shot.position : -1;

  const ordered = [...session.shots].sort(
    (left, right) => positionOf(left) - positionOf(right),
  );

  if (ordered.length !== session.photoCount) {
    return { ok: false, error: MISSING_PHOTOS };
  }

  const seen = new Set<number>();

  for (const [index, shot] of ordered.entries()) {
    if (!isRecord(shot) || typeof shot.position !== "number") {
      return { ok: false, error: MISSING_PHOTOS };
    }

    const position = shot.position;

    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position >= session.photoCount ||
      seen.has(position) ||
      !isPhoto(shot.photo)
    ) {
      return { ok: false, error: MISSING_PHOTOS };
    }

    // Positions must be exactly 0…count-1, so a hole cannot silently shift a
    // photo into the wrong frame of the print.
    if (position !== index) {
      return { ok: false, error: MISSING_PHOTOS };
    }

    seen.add(position);
  }

  const shots = ordered.map((shot) =>
    savedShot(shot.photo as { id: string; src: string }),
  );

  const print = session.print;

  const config: BoothEditorConfig = {
    borderKey: settings.value.borderKey,
    backgroundKey: settings.value.backgroundKey,
    stickers: settings.value.stickers,
    caption: settings.value.caption,
    showDate: settings.value.showDate,
    // The print's own date, not when the row was written. A session saved with
    // the date hidden still needs a sensible value for the date field.
    date: settings.value.printDate ?? toDateValue(new Date()),
    spacing: settings.value.spacing,
    borderWidth: settings.value.borderWidth,
  };

  return {
    ok: true,
    value: {
      sessionId: session.id,
      photoCount: session.photoCount,
      layout: session.layout,
      config,
      shots,
      print,
      summary: {
        id: session.id,
        createdAt: session.createdAt,
        photoCount: session.photoCount,
        layout: session.layout,
        borderKey: settings.value.borderKey,
        caption: settings.value.caption,
        printDate: settings.value.printDate,
        print: session.print,
        shotCount: shots.length,
        shotThumbs: ordered.map((shot) => ({
          id: (shot.photo as { id: string; src: string }).id,
          src: (shot.photo as { id: string; src: string }).src,
        })),
      },
    },
  };
}
