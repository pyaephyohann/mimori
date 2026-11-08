/**
 * Server-side validation for collection payloads.
 *
 * Pure functions with no framework or database imports, so they can be tested
 * directly. `allowedPhotoIds` is injected rather than imported so the rules do
 * not depend on where the gallery manifest lives.
 */

import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_COLLECTION_PHOTOS,
} from "./catalog.ts";

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type CollectionDraft = {
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  photoIds: string[];
};

/** Fields a client may change on an existing collection. */
export type CollectionPatch = {
  name?: string;
  description?: string | null;
  pinned?: boolean;
  coverPhotoId?: string | null;
  /** Replaces the whole membership list, in display order. */
  photoIds?: string[];
  /** Appends photos that are not already in the collection. */
  addPhotoIds?: string[];
  removePhotoIds?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseName(value: unknown): Parsed<string> {
  if (typeof value !== "string") {
    return { ok: false, error: "Give the collection a name." };
  }

  // Collapse runs of whitespace so " Our   Trip " cannot create a near-duplicate
  // of "Our Trip".
  const name = value.trim().replace(/\s+/g, " ");

  if (name === "") {
    return { ok: false, error: "Give the collection a name." };
  }

  if (name.length > MAX_COLLECTION_NAME_LENGTH) {
    return {
      ok: false,
      error: `Keep the name under ${MAX_COLLECTION_NAME_LENGTH} characters.`,
    };
  }

  return { ok: true, value: name };
}

export function parseDescription(value: unknown): Parsed<string | null> {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "The description must be text." };
  }

  const description = value.trim();

  if (description === "") {
    return { ok: true, value: null };
  }

  if (description.length > MAX_COLLECTION_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Keep the description under ${MAX_COLLECTION_DESCRIPTION_LENGTH} characters.`,
    };
  }

  return { ok: true, value: description };
}

/** A list of gallery photo ids, each once, in the order given. */
export function parsePhotoIds(
  value: unknown,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<string[]> {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
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

  if (ids.length > MAX_COLLECTION_PHOTOS) {
    return {
      ok: false,
      error: `A collection can hold at most ${MAX_COLLECTION_PHOTOS} photos.`,
    };
  }

  return { ok: true, value: ids };
}

/** A cover is either a gallery photo or explicitly cleared. */
export function parseCover(
  value: unknown,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<string | null> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  if (typeof value !== "string" || !allowedPhotoIds.has(value)) {
    return { ok: false, error: "That cover photo is not in the gallery." };
  }

  return { ok: true, value };
}

export function parsePinned(value: unknown): Parsed<boolean> {
  if (typeof value !== "boolean") {
    return { ok: false, error: "Pinned must be true or false." };
  }

  return { ok: true, value };
}

export function parseCreate(
  body: unknown,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<CollectionDraft> {
  if (!isRecord(body)) {
    return { ok: false, error: "Expected a collection payload." };
  }

  const name = parseName(body.name);

  if (!name.ok) {
    return name;
  }

  const description = parseDescription(body.description);

  if (!description.ok) {
    return description;
  }

  const coverPhotoId = parseCover(body.coverPhotoId, allowedPhotoIds);

  if (!coverPhotoId.ok) {
    return coverPhotoId;
  }

  const photoIds = parsePhotoIds(body.photoIds, allowedPhotoIds);

  if (!photoIds.ok) {
    return photoIds;
  }

  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value,
      coverPhotoId: coverPhotoId.value,
      photoIds: photoIds.value,
    },
  };
}

export function parseUpdate(
  body: unknown,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<CollectionPatch> {
  if (!isRecord(body)) {
    return { ok: false, error: "Expected a collection payload." };
  }

  const patch: CollectionPatch = {};

  if ("name" in body) {
    const name = parseName(body.name);

    if (!name.ok) {
      return name;
    }

    patch.name = name.value;
  }

  if ("description" in body) {
    const description = parseDescription(body.description);

    if (!description.ok) {
      return description;
    }

    patch.description = description.value;
  }

  if ("pinned" in body) {
    const pinned = parsePinned(body.pinned);

    if (!pinned.ok) {
      return pinned;
    }

    patch.pinned = pinned.value;
  }

  if ("coverPhotoId" in body) {
    const cover = parseCover(body.coverPhotoId, allowedPhotoIds);

    if (!cover.ok) {
      return cover;
    }

    patch.coverPhotoId = cover.value;
  }

  for (const key of ["photoIds", "addPhotoIds", "removePhotoIds"] as const) {
    if (!(key in body)) {
      continue;
    }

    const ids = parsePhotoIds(body[key], allowedPhotoIds);

    if (!ids.ok) {
      return ids;
    }

    patch[key] = ids.value;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  return { ok: true, value: patch };
}

/** Payload for moving photos out of one collection and into another. */
export type MoveRequest = {
  fromId: string | null;
  toId: string | null;
  photoIds: string[];
};

export function parseMove(
  body: unknown,
  allowedPhotoIds: ReadonlySet<string>,
): Parsed<MoveRequest> {
  if (!isRecord(body)) {
    return { ok: false, error: "Expected a move payload." };
  }

  const readId = (value: unknown): string | null | undefined =>
    value === null || value === undefined || value === ""
      ? null
      : typeof value === "string"
        ? value
        : undefined;

  const fromId = readId(body.fromId);
  const toId = readId(body.toId);

  if (fromId === undefined || toId === undefined) {
    return { ok: false, error: "Collections must be ids or null." };
  }

  if (fromId !== null && fromId === toId) {
    return { ok: false, error: "Pick a different collection to move to." };
  }

  if (fromId === null && toId === null) {
    return { ok: false, error: "Nothing to move." };
  }

  const photoIds = parsePhotoIds(body.photoIds, allowedPhotoIds);

  if (!photoIds.ok) {
    return photoIds;
  }

  if (photoIds.value.length === 0) {
    return { ok: false, error: "Choose at least one photo to move." };
  }

  return { ok: true, value: { fromId, toId, photoIds: photoIds.value } };
}
