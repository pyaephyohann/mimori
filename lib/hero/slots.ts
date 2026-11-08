import type { Photo } from "../photo.ts";

/**
 * The hero carousel's eight fixed slots.
 *
 * Every slot always exists. It is either *empty* — drawn as a colourful square
 * — or *assigned* a gallery photo and a title. Because the slots themselves are
 * fixed, the per-visit shuffle still reorders eight slides and the layout never
 * changes shape; only the pictures inside it come and go.
 *
 * A stored assignment keeps the gallery photo's id, never its URL: the picture
 * is resolved from the `Photo` row on every read, so a photo's current URL is
 * always the one shown, and a deleted photo simply empties its slot.
 *
 * Pure functions only, so the parsing and merging rules can be executed and
 * checked directly (see `slots.test.ts`).
 */

export const HERO_SLOT_COUNT = 8;

/** `hero-slot-1` … `hero-slot-8`, in carousel order. */
export const HERO_SLOT_IDS: readonly string[] = Array.from(
  { length: HERO_SLOT_COUNT },
  (_, index) => `hero-slot-${index + 1}`,
);

/** Longest accepted title, in characters. */
export const MAX_HERO_TITLE_LENGTH = 80;

/** Longest accepted photo id, matching a cuid's practical length. */
const MAX_ID_LENGTH = 128;

/** One carousel position: assigned a photo, or empty. */
export type HeroSlot = {
  /** `hero-slot-N` — stable across visits, so the shuffle can remember it. */
  id: string;
  /** `null` means empty: the carousel draws a colourful square. */
  photo: Photo | null;
  /** The slot's title; empty when the slot is empty. */
  title: string;
};

/** What the store keeps for one assigned slot. */
export type HeroAssignment = {
  slotId: string;
  /** The gallery `Photo` id. */
  photoId: string;
  title: string;
};

export type HeroReplacement = {
  slotId: string;
  sourceId: string;
  /** `null` keeps whatever title the slot already has. */
  title: string | null;
};

export type HeroReplacementResult =
  | { ok: true; value: HeroReplacement }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isHeroSlotId(value: unknown): value is string {
  return typeof value === "string" && HERO_SLOT_IDS.includes(value);
}

function readTitle(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const title = value.trim();

  return title.length > 0 && title.length <= MAX_HERO_TITLE_LENGTH ? title : "";
}

/**
 * Reads the stored assignments from the reserved `Widget.config` value.
 *
 * Unknown slots, missing ids and duplicate slots are dropped (a slot listed
 * twice keeps its last entry), so a damaged row cannot break the carousel.
 */
export function parseHeroAssignments(raw: unknown): HeroAssignment[] {
  const source = isRecord(raw) ? raw.slots : undefined;
  const entries = Array.isArray(source) ? source : [];
  const bySlot = new Map<string, HeroAssignment>();

  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue;
    }

    const { slotId, photoId } = entry;

    if (!isHeroSlotId(slotId)) {
      continue;
    }

    if (
      typeof photoId !== "string" ||
      photoId.trim() === "" ||
      photoId.length > MAX_ID_LENGTH
    ) {
      continue;
    }

    bySlot.set(slotId, { slotId, photoId, title: readTitle(entry.title) });
  }

  return sortAssignments([...bySlot.values()]);
}

function sortAssignments(assignments: readonly HeroAssignment[]): HeroAssignment[] {
  return [...assignments].sort(
    (a, b) => HERO_SLOT_IDS.indexOf(a.slotId) - HERO_SLOT_IDS.indexOf(b.slotId),
  );
}

/**
 * The carousel's eight slots, in fixed order, filled from the assignments.
 *
 * An assignment whose photo is missing — deleted, or never a gallery photo —
 * leaves its slot empty rather than pointing at a broken image.
 */
export function buildHeroSlots(
  assignments: readonly HeroAssignment[],
  photosById: ReadonlyMap<string, Photo>,
): HeroSlot[] {
  const bySlot = new Map(assignments.map((entry) => [entry.slotId, entry]));

  return HERO_SLOT_IDS.map((slotId) => {
    const assignment = bySlot.get(slotId);
    const photo = assignment ? photosById.get(assignment.photoId) : undefined;

    return {
      id: slotId,
      photo: photo ?? null,
      title: photo ? assignment?.title ?? "" : "",
    };
  });
}

/** Replaces one slot's assignment, leaving every other slot alone. */
export function applyHeroAssignment(
  assignments: readonly HeroAssignment[],
  next: HeroAssignment,
): HeroAssignment[] {
  return sortAssignments([
    ...assignments.filter((entry) => entry.slotId !== next.slotId),
    next,
  ]);
}

/** Validates a replace request. The image URL itself is resolved server-side. */
export function parseHeroReplacement(input: unknown): HeroReplacementResult {
  if (!isRecord(input)) {
    return { ok: false, error: "Expected a JSON body." };
  }

  const { slotId, sourceId } = input;

  if (!isHeroSlotId(slotId)) {
    return { ok: false, error: "Choose which carousel slot to fill." };
  }

  if (
    typeof sourceId !== "string" ||
    sourceId.trim() === "" ||
    sourceId.length > MAX_ID_LENGTH
  ) {
    return { ok: false, error: "That gallery photo is missing." };
  }

  // Omitting the title keeps the slot's existing one; a provided title must be
  // real text, so an empty field cannot silently erase it.
  const { title } = input;

  if (title === undefined || title === null) {
    return { ok: true, value: { slotId, sourceId, title: null } };
  }

  if (typeof title !== "string") {
    return { ok: false, error: "Give the carousel photo a title." };
  }

  const trimmed = title.trim();

  if (trimmed === "") {
    return { ok: false, error: "Give the carousel photo a title." };
  }

  if (trimmed.length > MAX_HERO_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Keep the title under ${MAX_HERO_TITLE_LENGTH + 1} characters.`,
    };
  }

  return { ok: true, value: { slotId, sourceId, title: trimmed } };
}
