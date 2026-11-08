import "server-only";

import type { Photo } from "../photo";
import { getPrisma } from "../db";
import { loadPhotosByIds } from "../gallery-photos";
import {
  applyHeroAssignment,
  buildHeroSlots,
  parseHeroAssignments,
  type HeroAssignment,
  type HeroSlot,
} from "./slots";

/**
 * Hero carousel persistence.
 *
 * The eight slots live in the existing `Widget` table: one reserved row
 * (`type = "hero-carousel"`) whose `config` holds
 * `{ slots: [{ slotId, photoId, title }] }`. The JSON column exists for exactly
 * this kind of configuration, and the layout rows are untouched because
 * `listWidgets()` ignores types outside the catalogue.
 *
 * `photoId` is a gallery `Photo` id, never a URL and never a bundled image. The
 * `Photo` row is the single record for the picture, so nothing is uploaded or
 * duplicated, and a slot whose photo no longer exists simply reads as empty.
 */

/** Reserved `Widget.type` for the carousel slots. */
export const HERO_ROW_TYPE = "hero-carousel";
const HERO_ROW_NAME = "Hero carousel";

export class HeroSourceError extends Error {
  constructor() {
    super("That gallery photo could not be found.");
    this.name = "HeroSourceError";
  }
}

export class HeroTitleError extends Error {
  constructor() {
    super("Give the carousel photo a title.");
    this.name = "HeroTitleError";
  }
}

export type HeroState = {
  slots: HeroSlot[];
  assignments: HeroAssignment[];
};

function readHeroRow() {
  return getPrisma().widget.findFirst({
    where: { type: HERO_ROW_TYPE },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, config: true },
  });
}

async function readAssignments(): Promise<HeroAssignment[]> {
  const row = await readHeroRow();

  return parseHeroAssignments(row?.config);
}

async function toState(assignments: HeroAssignment[]): Promise<HeroState> {
  const photosById = await loadPhotosByIds(
    assignments.map((assignment) => assignment.photoId),
  );

  return { slots: buildHeroSlots(assignments, photosById), assignments };
}

/** The carousel as it stands right now. */
export async function readHero(): Promise<HeroState> {
  return toState(await readAssignments());
}

/**
 * The home page's eight slots.
 *
 * A storage failure is reported, not hidden: the page still renders the eight
 * empty squares, with a quiet note that the carousel could not be loaded. It
 * never borrows a picture to fill the gap.
 */
export async function loadHeroSlots(): Promise<{
  slots: HeroSlot[];
  failed: boolean;
}> {
  try {
    const { slots } = await readHero();

    return { slots, failed: false };
  } catch (error) {
    console.error("The hero carousel slots could not be read.", error);

    return { slots: buildHeroSlots([], new Map<string, Photo>()), failed: true };
  }
}

/**
 * Assigns a gallery photo and a title to one slot, and returns the carousel as
 * it now stands. `title === null` keeps the slot's current title; filling an
 * empty slot therefore needs an explicit title.
 */
export async function replaceHeroImage(
  slotId: string,
  sourceId: string,
  title: string | null,
): Promise<HeroState> {
  const photosById = await loadPhotosByIds([sourceId]);

  if (!photosById.has(sourceId)) {
    throw new HeroSourceError();
  }

  const assignments = await readAssignments();
  const current = assignments.find((entry) => entry.slotId === slotId);
  const nextTitle = title ?? current?.title ?? "";

  if (nextTitle.trim() === "") {
    throw new HeroTitleError();
  }

  const next = applyHeroAssignment(assignments, {
    slotId,
    photoId: sourceId,
    title: nextTitle.trim(),
  });
  const config = { slots: next };
  const row = await readHeroRow();

  if (row) {
    await getPrisma().widget.update({ where: { id: row.id }, data: { config } });
  } else {
    await getPrisma().widget.create({
      data: { type: HERO_ROW_TYPE, name: HERO_ROW_NAME, config },
    });
  }

  return toState(next);
}
