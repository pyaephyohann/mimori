/**
 * The photobooth editor's configuration.
 *
 * Nothing here touches React or the DOM: the editor UI, the composition
 * geometry and the canvas renderer all read the same values, so a change is one
 * state update rather than a second source of truth. The captured photographs
 * are deliberately **not** part of this config — the editor only decorates
 * around them, and can never replace or discard a shot.
 */

import { DEFAULT_BORDER_KEY, type BorderKey } from "./borders.ts";
import type { BackgroundKey } from "./backgrounds.ts";
import {
  DEFAULT_BORDER_WIDTH,
  DEFAULT_SPACING,
  MAX_STICKER_SIZE,
  MAX_USER_STICKERS,
  MIN_STICKER_SIZE,
  type StickerPlacement,
} from "./compose.ts";
import type { StickerKey } from "./stickers.ts";

/** Long enough for "Every little moment with you", short enough for a plate. */
export const MAX_CAPTION_LENGTH = 48;

/** The default side of a newly added sticker, as a fraction of the width. */
export const DEFAULT_STICKER_SIZE = 0.14;

export type BoothEditorConfig = {
  borderKey: BorderKey;
  /** null keeps the border template's own paper. */
  backgroundKey: BackgroundKey | null;
  stickers: StickerPlacement[];
  caption: string;
  showDate: boolean;
  /** `yyyy-mm-dd`, the value an `<input type="date">` uses. */
  date: string;
  /** Gap between photos, in composition units. */
  spacing: number;
  /** Frame thickness, in composition units. */
  borderWidth: number;
};

/** Local `yyyy-mm-dd`, so the default date matches the visitor's calendar. */
export function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * A deterministic starting point for the React state.
 *
 * The real date is filled in by `startSession`, which is an event handler; a
 * `new Date()` during render would be treated as a prerender-time value by
 * Next. The placeholder date is never shown in a session.
 */
export const INITIAL_EDITOR_CONFIG: BoothEditorConfig = {
  borderKey: DEFAULT_BORDER_KEY,
  backgroundKey: null,
  stickers: [],
  caption: "",
  showDate: true,
  date: "2026-01-01",
  spacing: DEFAULT_SPACING,
  borderWidth: DEFAULT_BORDER_WIDTH,
};

export function createBoothEditorConfig(
  borderKey: BorderKey,
  today: Date = new Date(),
): BoothEditorConfig {
  return {
    borderKey,
    backgroundKey: null,
    stickers: [],
    caption: "",
    showDate: true,
    date: toDateValue(today),
    spacing: DEFAULT_SPACING,
    borderWidth: DEFAULT_BORDER_WIDTH,
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * `2026-11-03` → `3 November 2026`.
 *
 * Parsed by hand so the printed date cannot shift by a day through a timezone
 * conversion, and so an empty or malformed value simply prints nothing.
 */
export function formatBoothDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return "";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }

  const probe = new Date(year, month - 1, day);

  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return "";
  }

  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Collapses stray spaces and enforces the caption's limit. */
export function normalizeCaption(value: string): string {
  return value.replace(/\s+/g, " ").trimStart().slice(0, MAX_CAPTION_LENGTH);
}

/**
 * The title size that keeps a caption inside its plate.
 *
 * Caveat averages roughly 0.46 of its size per character, so the estimate lets
 * the DOM preview and the canvas renderer pick the same size and neither clips
 * a long caption. Returns the base size when it already fits.
 */
export function fitCaptionSize(
  text: string,
  baseSize: number,
  maxWidth: number,
): number {
  const characters = text.trim().length;

  if (characters === 0 || !(baseSize > 0) || !(maxWidth > 0)) {
    return baseSize;
  }

  const estimated = characters * baseSize * 0.46;

  if (estimated <= maxWidth) {
    return baseSize;
  }

  return Math.max(10, Math.floor(maxWidth / (characters * 0.46)));
}

/** Where a new sticker lands, cycling through pretty, non-overlapping spots. */
const STARTER_SPOTS = [
  { x: 0.16, y: 0.12, rotate: -12 },
  { x: 0.84, y: 0.14, rotate: 10 },
  { x: 0.14, y: 0.6, rotate: 8 },
  { x: 0.86, y: 0.64, rotate: -8 },
  { x: 0.5, y: 0.07, rotate: 0 },
  { x: 0.32, y: 0.9, rotate: -6 },
  { x: 0.7, y: 0.88, rotate: 6 },
  { x: 0.06, y: 0.36, rotate: 4 },
  { x: 0.94, y: 0.38, rotate: -4 },
  { x: 0.5, y: 0.94, rotate: 2 },
] as const;

let stickerSequence = 0;

export function createStickerId(): string {
  stickerSequence += 1;

  return `sticker-${Date.now().toString(36)}-${stickerSequence}`;
}

/** Adds one sticker at the next spot; a full page leaves the config alone. */
export function addSticker(
  config: BoothEditorConfig,
  sticker: StickerKey,
  id: string,
): BoothEditorConfig {
  if (config.stickers.length >= MAX_USER_STICKERS) {
    return config;
  }

  const spot = STARTER_SPOTS[config.stickers.length % STARTER_SPOTS.length];

  return {
    ...config,
    stickers: [
      ...config.stickers,
      {
        id,
        sticker,
        x: spot.x,
        y: spot.y,
        size: DEFAULT_STICKER_SIZE,
        rotate: spot.rotate,
      },
    ],
  };
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

/** Moves a sticker by fraction; the geometry keeps the square on the page. */
export function moveSticker(
  config: BoothEditorConfig,
  id: string,
  x: number,
  y: number,
): BoothEditorConfig {
  return {
    ...config,
    stickers: config.stickers.map((sticker) =>
      sticker.id === id
        ? { ...sticker, x: clampFraction(x), y: clampFraction(y) }
        : sticker,
    ),
  };
}

export type StickerPatch = Partial<
  Pick<StickerPlacement, "size" | "rotate">
>;

/** Resizes or tilts a sticker within the limits the geometry enforces. */
export function updateSticker(
  config: BoothEditorConfig,
  id: string,
  patch: StickerPatch,
): BoothEditorConfig {
  return {
    ...config,
    stickers: config.stickers.map((sticker) => {
      if (sticker.id !== id) {
        return sticker;
      }

      const size =
        patch.size === undefined
          ? sticker.size
          : Math.min(MAX_STICKER_SIZE, Math.max(MIN_STICKER_SIZE, patch.size));
      const rotate =
        patch.rotate === undefined
          ? sticker.rotate
          : Math.min(180, Math.max(-180, patch.rotate));

      return { ...sticker, size, rotate };
    }),
  };
}

export function removeSticker(
  config: BoothEditorConfig,
  id: string,
): BoothEditorConfig {
  return {
    ...config,
    stickers: config.stickers.filter((sticker) => sticker.id !== id),
  };
}
