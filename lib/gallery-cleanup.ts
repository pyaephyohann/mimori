/**
 * Removing a deleted photo's references from stored configuration.
 *
 * A gallery photo can be referenced from places that have no foreign key: a
 * widget's `config.photoIds` and the hero carousel's `config.slots`. Deleting
 * the `Photo` row therefore has to rewrite those JSON documents, and the rules
 * are kept here as pure functions so they can be executed and checked directly
 * (see `gallery-cleanup.test.ts`).
 *
 * Every function answers `null` when the document did not mention the photo, so
 * the caller writes only the rows that actually changed and never "cleans" an
 * unrelated widget.
 */

import { parseHeroAssignments } from "./hero/slots.ts";

export type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A widget's config without `photoId` in `photoIds`.
 *
 * Order, size, position and every other key are preserved, because the widget
 * itself stays exactly where it is — only the vanished picture leaves it. A
 * widget left with no photos renders its existing "choose photos" state.
 */
export function stripPhotoFromWidgetConfig(
  config: unknown,
  photoId: string,
): JsonRecord | null {
  if (!isRecord(config) || !Array.isArray(config.photoIds)) {
    return null;
  }

  const photoIds = config.photoIds;
  const remaining = photoIds.filter((id) => id !== photoId);

  if (remaining.length === photoIds.length) {
    return null;
  }

  return { ...config, photoIds: remaining };
}

/**
 * The hero carousel's config without the assignment that points at `photoId`.
 *
 * Dropping the assignment is what empties the slot: the carousel then reads it
 * as unfilled and draws its existing empty placeholder, instead of holding a
 * reference to a photo that no longer exists.
 */
export function stripPhotoFromHeroConfig(
  config: unknown,
  photoId: string,
): JsonRecord | null {
  const assignments = parseHeroAssignments(config);
  const remaining = assignments.filter((entry) => entry.photoId !== photoId);

  if (remaining.length === assignments.length) {
    return null;
  }

  return { slots: remaining };
}
