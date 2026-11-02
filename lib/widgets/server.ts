import "server-only";

import { getPrisma } from "../db";
import { photos } from "../photos";
import {
  clampCoordinate,
  getCatalogEntry,
  isWidgetKind,
  isWidgetSize,
  type WidgetConfig,
  type WidgetRecord,
} from "./catalog.ts";
import type { WidgetDraft, WidgetPatch } from "./validate.ts";

/**
 * Widget persistence.
 *
 * The whole layout lives in the existing `Widget` table: `type` holds the
 * kind, `name` the catalogue title, and `config` the photos, copy, position,
 * size and painter's order. Keeping the layout in JSON means the approved
 * schema needs no migration, and the global (ownerless) model stays as it is.
 *
 * Photo references are ids from `lib/photos.ts` — the gallery's own source —
 * so a widget never duplicates an image.
 */

const allowedPhotoIds = new Set(photos.map((photo) => photo.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a stored config defensively: rows written by an older build must not
 *  break the page. Returns `null` when the row cannot be a widget at all. */
function readConfig(type: string, raw: unknown): WidgetConfig | null {
  if (!isWidgetKind(type)) {
    return null;
  }

  const entry = getCatalogEntry(type);
  const source = isRecord(raw) ? raw : {};

  const photoIds = Array.isArray(source.photoIds)
    ? source.photoIds
        .filter(
          (id): id is string =>
            typeof id === "string" && allowedPhotoIds.has(id),
        )
        .slice(0, entry.maxPhotos)
    : [];

  const position = isRecord(source.position) ? source.position : {};

  return {
    kind: type,
    photoIds,
    text: typeof source.text === "string" ? source.text : "",
    date: typeof source.date === "string" ? source.date : "",
    position: {
      x: typeof position.x === "number" ? clampCoordinate(position.x) : 0,
      y: typeof position.y === "number" ? clampCoordinate(position.y) : 0,
    },
    size: isWidgetSize(source.size) ? source.size : entry.defaultSize,
    z: typeof source.z === "number" && Number.isFinite(source.z)
      ? Math.max(0, Math.round(source.z))
      : 0,
  };
}

type WidgetRow = {
  id: string;
  name: string;
  type: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: WidgetRow): WidgetRecord | null {
  const config = readConfig(row.type, row.config);

  if (!config) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    kind: config.kind,
    config,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWidgets(): Promise<WidgetRecord[]> {
  const rows = await getPrisma().widget.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return rows
    .map(toRecord)
    .filter((record): record is WidgetRecord => record !== null)
    .sort((a, b) => a.config.z - b.config.z);
}

export async function getWidget(id: string): Promise<WidgetRecord | null> {
  const row = await getPrisma().widget.findUnique({ where: { id } });

  return row ? toRecord(row) : null;
}

export async function createWidget(draft: WidgetDraft): Promise<WidgetRecord> {
  const existing = await listWidgets();
  const nextZ =
    existing.reduce((highest, widget) => Math.max(highest, widget.config.z), 0) + 1;
  const entry = getCatalogEntry(draft.kind);

  const row = await getPrisma().widget.create({
    data: {
      name: entry.title,
      type: draft.kind,
      config: {
        photoIds: draft.photoIds,
        text: draft.text,
        date: draft.date,
        position: draft.position,
        size: draft.size,
        z: nextZ,
      },
    },
  });

  const record = toRecord(row);

  if (!record) {
    throw new Error("The new widget could not be read back.");
  }

  return record;
}

export async function updateWidget(
  id: string,
  patch: WidgetPatch,
  z?: number,
): Promise<WidgetRecord | null> {
  const row = await getPrisma().widget.findUnique({ where: { id } });

  if (!row) {
    return null;
  }

  const current = readConfig(row.type, row.config);

  if (!current) {
    return null;
  }

  const next: WidgetConfig = {
    ...current,
    ...("photoIds" in patch ? { photoIds: patch.photoIds ?? [] } : {}),
    ...(patch.text !== undefined ? { text: patch.text } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.position !== undefined ? { position: patch.position } : {}),
    ...(patch.size !== undefined ? { size: patch.size } : {}),
    ...(z !== undefined ? { z } : {}),
  };

  const updated = await getPrisma().widget.update({
    where: { id },
    data: {
      config: {
        photoIds: next.photoIds,
        text: next.text,
        date: next.date,
        position: next.position,
        size: next.size,
        z: next.z,
      },
    },
  });

  return toRecord(updated);
}

export async function deleteWidget(id: string): Promise<boolean> {
  const existing = await getPrisma().widget.findUnique({ where: { id } });

  if (!existing) {
    return false;
  }

  await getPrisma().widget.delete({ where: { id } });

  return true;
}
