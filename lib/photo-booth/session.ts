/**
 * Validating a saved photobooth session.
 *
 * Kept free of Prisma, React and `server-only` imports so the rules can be
 * covered by plain `node:test`: the Route Handlers parse the request body with
 * this module and then check the referenced rows against the database. Nothing
 * here reads or rewrites a photo — a session only ever *references* captures.
 *
 * Creating and updating share one settings parser. They differ in what may
 * change: a new session supplies its captures, while an update must keep the
 * ones it already has, so the update parser refuses any attempt to name
 * different photos.
 */

import {
  isBackgroundKey,
  type BackgroundKey,
} from "./backgrounds.ts";
import { isBorderKey, type BorderKey } from "./borders.ts";
import {
  isBoothLayout,
  isPhotoCount,
  type BoothLayout,
  type PhotoCount,
} from "./catalog.ts";
import {
  MAX_BORDER_WIDTH,
  MAX_SPACING,
  MAX_STICKER_SIZE,
  MAX_USER_STICKERS,
  MIN_BORDER_WIDTH,
  MIN_SPACING,
  MIN_STICKER_SIZE,
  type StickerPlacement,
} from "./compose.ts";
import { MAX_CAPTION_LENGTH } from "./editor.ts";
import { isStickerKey } from "./stickers.ts";

/**
 * Captures and finished prints are both stored as booth photos, so the Gallery
 * (which filters on `GALLERY`) never lists anything a Photo Booth session made.
 */
export const BOOTH_SHOT_KIND = "PHOTO_BOOTH";
export const BOOTH_PRINT_KIND = "PHOTO_BOOTH";

/**
 * Prints saved before Photo Booth kept its own kind were ordinary `GALLERY`
 * photos. They stay valid prints so those sessions can still be reopened and
 * edited; new prints never use this kind.
 */
export const LEGACY_BOOTH_PRINT_KIND = "GALLERY";

/** Longest id accepted from a client, well above a cuid. */
const MAX_ID_LENGTH = 64;

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The settings half of a session: everything the editor can change. */
export type BoothSessionSettings = {
  borderKey: BorderKey;
  backgroundKey: BackgroundKey | null;
  caption: string;
  showDate: boolean;
  /** `yyyy-mm-dd`, or null when the print carries no date. */
  printDate: string | null;
  spacing: number;
  borderWidth: number;
  stickers: StickerPlacement[];
};

/** The settings a session stores, already validated. */
export type BoothSessionInput = BoothSessionSettings & {
  photoCount: PhotoCount;
  layout: BoothLayout;
  printPhotoId: string;
  /** Capture order, first photo first. */
  shotPhotoIds: string[];
};

/** What a saved session's edit may change: settings and a new print. */
export type BoothUpdateInput = BoothSessionSettings & {
  /** A freshly rendered `PHOTO_BOOTH` photo that replaces the stored print. */
  printPhotoId: string;
};

export type BoothParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function fail<T>(error: string): BoothParseResult<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPhotoId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    ID_PATTERN.test(value)
  );
}

function isWholeNumberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isFraction(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** A real calendar date, so `2026-02-30` is refused rather than printed. */
export function isBoothDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);

  return (
    probe.getFullYear() === year &&
    probe.getMonth() === month - 1 &&
    probe.getDate() === day
  );
}

/**
 * Validates a print's sticker layout.
 *
 * Shared with the restore path: a session is only ever written through this
 * check, so reopening it can trust the same rules and refuse anything a manual
 * database edit left behind.
 */
export function parseBoothStickers(
  value: unknown,
): BoothParseResult<StickerPlacement[]> {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return fail("The sticker layout must be a list.");
  }

  if (value.length > MAX_USER_STICKERS) {
    return fail(`A print can hold at most ${MAX_USER_STICKERS} stickers.`);
  }

  const seen = new Set<string>();
  const stickers: StickerPlacement[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return fail("One of the stickers could not be read.");
    }

    const { id, sticker, x, y, size, rotate } = entry;

    if (typeof id !== "string" || id.length === 0 || id.length > MAX_ID_LENGTH) {
      return fail("One of the stickers could not be read.");
    }

    if (seen.has(id)) {
      return fail("The same sticker was added twice.");
    }

    if (!isStickerKey(sticker)) {
      return fail("One of the stickers is not available.");
    }

    if (!isFraction(x) || !isFraction(y)) {
      return fail("A sticker was placed outside the printable area.");
    }

    if (
      typeof size !== "number" ||
      !Number.isFinite(size) ||
      size < MIN_STICKER_SIZE ||
      size > MAX_STICKER_SIZE
    ) {
      return fail("A sticker has an unsupported size.");
    }

    if (
      typeof rotate !== "number" ||
      !Number.isFinite(rotate) ||
      rotate < -180 ||
      rotate > 180
    ) {
      return fail("A sticker has an unsupported tilt.");
    }

    seen.add(id);
    stickers.push({ id, sticker, x, y, size, rotate });
  }

  return { ok: true, value: stickers };
}

/**
 * The editor settings, shared by create and update.
 *
 * Every field must make sense on its own; nothing here looks at the database or
 * at which photos are referenced.
 */
export function parseBoothSettings(
  value: Record<string, unknown>,
): BoothParseResult<BoothSessionSettings> {
  if (!isBorderKey(value.borderKey)) {
    return fail("That border is not one of the photobooth papers.");
  }

  let backgroundKey: BackgroundKey | null = null;

  if (value.backgroundKey !== undefined && value.backgroundKey !== null) {
    if (!isBackgroundKey(value.backgroundKey)) {
      return fail("That paper colour is not available.");
    }

    backgroundKey = value.backgroundKey;
  }

  const rawCaption = value.caption ?? "";

  if (typeof rawCaption !== "string") {
    return fail("The caption must be text.");
  }

  const caption = rawCaption.trim();

  if (caption.length > MAX_CAPTION_LENGTH) {
    return fail(`A caption can be at most ${MAX_CAPTION_LENGTH} characters.`);
  }

  const showDate = value.showDate ?? true;

  if (typeof showDate !== "boolean") {
    return fail("The date setting must be true or false.");
  }

  let printDate: string | null = null;
  const rawDate = value.printDate;

  if (rawDate !== undefined && rawDate !== null && rawDate !== "") {
    if (typeof rawDate !== "string" || !isBoothDate(rawDate)) {
      return fail("That date could not be read.");
    }

    printDate = rawDate;
  }

  if (!isWholeNumberInRange(value.spacing, MIN_SPACING, MAX_SPACING)) {
    return fail(`Spacing must be between ${MIN_SPACING} and ${MAX_SPACING}.`);
  }

  if (!isWholeNumberInRange(value.borderWidth, MIN_BORDER_WIDTH, MAX_BORDER_WIDTH)) {
    return fail(
      `Border thickness must be between ${MIN_BORDER_WIDTH} and ${MAX_BORDER_WIDTH}.`,
    );
  }

  const stickers = parseBoothStickers(value.stickers);

  if (!stickers.ok) {
    return stickers;
  }

  return {
    ok: true,
    value: {
      borderKey: value.borderKey,
      backgroundKey,
      caption,
      showDate,
      printDate: showDate ? printDate : null,
      spacing: value.spacing,
      borderWidth: value.borderWidth,
      stickers: stickers.value,
    },
  };
}

/**
 * Validates the body the Photobooth save sends.
 *
 * Every field is required to make sense on its own; the photo ids are checked
 * for shape here and for kind, existence and count against the database in
 * `validateSessionPhotos`.
 */
export function parseBoothSessionInput(
  value: unknown,
): BoothParseResult<BoothSessionInput> {
  if (!isRecord(value)) {
    return fail("Expected a JSON object.");
  }

  if (!isPhotoCount(value.photoCount)) {
    return fail("A photobooth print holds 2, 3, 4 or 6 photos.");
  }

  if (!isBoothLayout(value.layout)) {
    return fail("That layout is not one the photobooth offers.");
  }

  const settings = parseBoothSettings(value);

  if (!settings.ok) {
    return settings;
  }

  if (!isPhotoId(value.printPhotoId)) {
    return fail("The finished print is missing.");
  }

  if (!Array.isArray(value.shotPhotoIds)) {
    return fail("The captured photos are missing.");
  }

  if (value.shotPhotoIds.length !== value.photoCount) {
    return fail(
      `This print holds ${value.photoCount} photos, but ${value.shotPhotoIds.length} were sent.`,
    );
  }

  const shotPhotoIds: string[] = [];
  const uniqueShots = new Set<string>();

  for (const id of value.shotPhotoIds) {
    if (!isPhotoId(id)) {
      return fail("One of the captured photos could not be read.");
    }

    if (uniqueShots.has(id)) {
      return fail("The same photo was saved twice in one print.");
    }

    uniqueShots.add(id);
    shotPhotoIds.push(id);
  }

  if (uniqueShots.has(value.printPhotoId)) {
    return fail("The finished print cannot also be one of its photos.");
  }

  return {
    ok: true,
    value: {
      photoCount: value.photoCount,
      layout: value.layout,
      printPhotoId: value.printPhotoId,
      shotPhotoIds,
      ...settings.value,
    },
  };
}

/**
 * Validates the body an edit of a saved session sends.
 *
 * The captures, their order and the print's shape belong to the session, not to
 * one editing pass, so a body that tries to name photos is refused rather than
 * quietly ignored — the client learns it cannot swap the originals out.
 */
export function parseBoothUpdateInput(
  value: unknown,
): BoothParseResult<BoothUpdateInput> {
  if (!isRecord(value)) {
    return fail("Expected a JSON object.");
  }

  if (value.shotPhotoIds !== undefined && value.shotPhotoIds !== null) {
    return fail("The photos in a saved photobooth cannot be changed.");
  }

  if (value.photoCount !== undefined || value.layout !== undefined) {
    return fail("A saved photobooth keeps its photos and its layout.");
  }

  const settings = parseBoothSettings(value);

  if (!settings.ok) {
    return settings;
  }

  if (!isPhotoId(value.printPhotoId)) {
    return fail("The finished print is missing.");
  }

  return {
    ok: true,
    value: { printPhotoId: value.printPhotoId, ...settings.value },
  };
}

/** The `kind` of a referenced photo, or null when the row does not exist. */
export type SessionPhotoKind = { id: string; kind: string } | null;

/**
 * Checks the referenced rows: the shots and the print must be booth photos, and
 * the count must match the print's setting. Whether a row is already a print of
 * another session, or a capture of one, needs the database and is checked by the
 * server.
 *
 * `shots` is in capture order; a missing entry (null) means the id was not
 * found in the database.
 */
export function validateSessionPhotos(
  shots: readonly SessionPhotoKind[],
  print: SessionPhotoKind,
  photoCount: number,
): string | null {
  if (!print) {
    return "The finished print could not be found.";
  }

  if (print.kind !== BOOTH_PRINT_KIND && print.kind !== LEGACY_BOOTH_PRINT_KIND) {
    return "The finished print must be a Photo Booth print.";
  }

  if (shots.length !== photoCount) {
    return `This print holds ${photoCount} photos, but ${shots.length} were found.`;
  }

  for (const shot of shots) {
    if (!shot) {
      return "One of the photos in this print could not be found.";
    }

    if (shot.kind !== BOOTH_SHOT_KIND) {
      return "Only Photo Booth captures can be saved as a print's photos.";
    }
  }

  return null;
}
