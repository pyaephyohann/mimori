/**
 * Server-side validation for widget payloads.
 *
 * Pure functions with no framework imports, so they can be unit-tested
 * directly. `allowedPhotoIds` is injected rather than imported so the rules
 * stay independent of where the gallery manifest lives.
 */

import {
  MAX_TEXT_LENGTH,
  SNAP_GRID,
  clampCoordinate,
  getCatalogEntry,
  isWidgetKind,
  isWidgetSize,
  type WidgetKind,
  type WidgetPosition,
  type WidgetSize,
} from "./catalog.ts";

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type WidgetDraft = {
  kind: WidgetKind;
  photoIds: string[];
  text: string;
  date: string;
  position: WidgetPosition;
  size: WidgetSize;
};

/** Fields a client may change on an existing widget. */
export type WidgetPatch = Partial<WidgetDraft>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePhotoIds(
  value: unknown,
  kind: WidgetKind,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<string[]> {
  const { minPhotos, maxPhotos } = getCatalogEntry(kind);

  if (value === undefined || value === null) {
    if (minPhotos === 0) {
      return { ok: true, value: [] };
    }

    return { ok: false, error: `This widget needs ${minPhotos} photo(s).` };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Photos must be a list of gallery ids." };
  }

  const ids: string[] = [];

  for (const candidate of value) {
    if (typeof candidate !== "string" || !allowedPhotoIds.has(candidate)) {
      return { ok: false, error: "That photo is not in the gallery." };
    }

    if (ids.includes(candidate)) {
      return { ok: false, error: "The same photo was chosen twice." };
    }

    ids.push(candidate);
  }

  if (ids.length < minPhotos) {
    return {
      ok: false,
      error: `Choose at least ${minPhotos} photo${minPhotos === 1 ? "" : "s"}.`,
    };
  }

  if (ids.length > maxPhotos) {
    return {
      ok: false,
      error: `Choose no more than ${maxPhotos} photo${maxPhotos === 1 ? "" : "s"}.`,
    };
  }

  return { ok: true, value: ids };
}

export function parseText(value: unknown): Parsed<string> {
  if (value === undefined || value === null) {
    return { ok: true, value: "" };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "The note must be text." };
  }

  const text = value.trim();

  if (text.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Keep the note under ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  return { ok: true, value: text };
}

export function parseDate(value: unknown): Parsed<string> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "" };
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: "Pick a date as YYYY-MM-DD." };
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  // A round-trip catches dates that roll over, such as 2024-02-31.
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return { ok: false, error: "That date does not exist." };
  }

  return { ok: true, value };
}

export function parseSize(value: unknown, fallback: WidgetSize): WidgetSize {
  return isWidgetSize(value) ? value : fallback;
}

export function parsePosition(
  value: unknown,
  fallback: WidgetPosition,
): WidgetPosition {
  if (!isRecord(value)) {
    return fallback;
  }

  const x =
    typeof value.x === "number" ? clampCoordinate(value.x) : fallback.x;
  const y =
    typeof value.y === "number" ? clampCoordinate(value.y) : fallback.y;

  // Stored positions always sit on the soft grid, so a reloaded layout matches
  // the layout the user dropped.
  return {
    x: Math.round(x / SNAP_GRID) * SNAP_GRID,
    y: Math.round(y / SNAP_GRID) * SNAP_GRID,
  };
}

export function parseZ(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(9999, Math.max(0, Math.round(value)));
}

export function parseCreate(
  body: unknown,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<WidgetDraft> {
  if (!isRecord(body) || !isWidgetKind(body.kind)) {
    return { ok: false, error: "Choose a widget style first." };
  }

  const kind = body.kind;
  const entry = getCatalogEntry(kind);

  const photoIds = parsePhotoIds(body.photoIds, kind, allowedPhotoIds);

  if (!photoIds.ok) {
    return photoIds;
  }

  const text = parseText(body.text);

  if (!text.ok) {
    return text;
  }

  const date = parseDate(body.date);

  if (!date.ok) {
    return date;
  }

  return {
    ok: true,
    value: {
      kind,
      photoIds: photoIds.value,
      text: text.value,
      date: date.value,
      position: parsePosition(body.position, { x: 0, y: 0 }),
      size: parseSize(body.size, entry.defaultSize),
    },
  };
}

export function parseUpdate(
  body: unknown,
  currentKind: WidgetKind,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<WidgetPatch> {
  if (!isRecord(body)) {
    return { ok: false, error: "Expected a widget payload." };
  }

  const patch: WidgetPatch = {};

  if ("photoIds" in body) {
    const photoIds = parsePhotoIds(body.photoIds, currentKind, allowedPhotoIds);

    if (!photoIds.ok) {
      return photoIds;
    }

    patch.photoIds = photoIds.value;
  }

  if ("text" in body) {
    const text = parseText(body.text);

    if (!text.ok) {
      return text;
    }

    patch.text = text.value;
  }

  if ("date" in body) {
    const date = parseDate(body.date);

    if (!date.ok) {
      return date;
    }

    patch.date = date.value;
  }

  if ("position" in body && isRecord(body.position)) {
    patch.position = parsePosition(body.position, { x: 0, y: 0 });
  }

  if ("size" in body) {
    const entry = getCatalogEntry(currentKind);
    patch.size = parseSize(body.size, entry.defaultSize);
  }

  const kindChange = "kind" in body && body.kind !== currentKind;

  if (kindChange) {
    return { ok: false, error: "A widget's style cannot be changed." };
  }

  if (Object.keys(patch).length === 0 && !("z" in body)) {
    return { ok: false, error: "Nothing to update." };
  }

  return { ok: true, value: patch };
}
