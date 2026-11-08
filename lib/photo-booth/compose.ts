/**
 * Photobooth composition geometry.
 *
 * A pure function that turns a setup choice into every rectangle a booth needs:
 * the frame, its inner page, each photo slot, the caption plate and the corner
 * decorations. The DOM preview and the future canvas exporter both read this,
 * so what is shown and what is saved cannot drift apart.
 *
 * Composition units are unitless numbers; consumers scale them to their own
 * box. Nothing here touches the DOM, React, the database or `Date`.
 */

import type { BoothLayout, PhotoCount } from "./catalog.ts";
import {
  getBorderTemplate,
  type BorderKey,
  type BorderDecoration,
} from "./borders.ts";
import { getSticker, isStickerKey, type StickerKey } from "./stickers.ts";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CompositionConfig = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  borderKey: BorderKey;
  /** Frame thickness, in composition units. */
  borderWidth?: number;
  /** Gap between photo slots and above the caption plate. */
  spacing?: number;
  /** Reserve the plate the caption and date are written on. */
  caption?: boolean;
  /** Paper colour of the frame; defaults to the border template's own. */
  background?: string;
  /** Stickers the visitor places in the editor, positioned as fractions. */
  stickers?: readonly StickerPlacement[];
};

export type PlacedDecoration = {
  sticker: StickerKey;
  glyph: string;
  x: number;
  y: number;
  /** Side of the sticker's square box, in composition units. */
  size: number;
  rotate: number;
};

export type StickerPlacement = {
  id: string;
  sticker: StickerKey;
  /** Centre, as a fraction of the composition's width. */
  x: number;
  /** Centre, as a fraction of the composition's height. */
  y: number;
  /** Side of the sticker's square box, as a fraction of the width. */
  size: number;
  /** Degrees of scrapbook tilt. */
  rotate: number;
};

export type PlacedSticker = StickerPlacement & {
  glyph: string;
  /** Top-left corner, in composition units, already clamped inside the page. */
  left: number;
  top: number;
  /** Side of the sticker, in composition units. */
  side: number;
};

/** Where the caption and the date are written, in composition units. */
export type CaptionTextMetrics = {
  title: Rect & { fontSize: number };
  date: Rect & { fontSize: number };
};

export type CompositionGeometry = {
  width: number;
  height: number;
  /** The whole composition, always anchored at the origin. */
  frame: Rect;
  /** The page inside the frame, where photos and the caption live. */
  inner: Rect;
  slots: Rect[];
  caption: Rect | null;
  /** Text boxes inside the caption plate; null when there is no plate. */
  captionText: CaptionTextMetrics | null;
  decorations: PlacedDecoration[];
  /** Paper colour the frame is painted with. */
  background: string;
  /** The visitor's own stickers, clamped inside the composition. */
  stickers: PlacedSticker[];
};

export const DEFAULT_BORDER_WIDTH = 56;
export const DEFAULT_SPACING = 18;
export const CAPTION_HEIGHT = 104;

export const MIN_BORDER_WIDTH = 24;
export const MAX_BORDER_WIDTH = 96;
export const MIN_SPACING = 8;
export const MAX_SPACING = 48;

/** The editor can add at most this many stickers to a print. */
export const MAX_USER_STICKERS = 10;

/** Sticker side, as a fraction of the composition width. */
export const MIN_STICKER_SIZE = 0.07;
export const MAX_STICKER_SIZE = 0.3;

/** Portrait 3:4 photos, sized so a strip stays a believable print. */
const STRIP_SLOT_WIDTH = 640;
const COLLAGE_SLOT_WIDTH = 320;
const SLOT_RATIO = 4 / 3;
const STRIP_SLOT_HEIGHT = Math.round(STRIP_SLOT_WIDTH * SLOT_RATIO);
const COLLAGE_SLOT_HEIGHT = Math.round(COLLAGE_SLOT_WIDTH * SLOT_RATIO);

/**
 * How the square layout arranges each supported count.
 *
 * Two photos sit side by side, three tuck one underneath the pair, four make a
 * two-by-two page and six fill a three-by-two grid. Each row is centred, so the
 * block reads as a collage rather than a grid with a hole in it.
 */
const COLLAGE_ROWS: Record<PhotoCount, readonly (readonly number[])[]> = {
  2: [[0, 1]],
  3: [
    [0, 1],
    [2],
  ],
  4: [
    [0, 1],
    [2, 3],
  ],
  6: [
    [0, 1, 2],
    [3, 4, 5],
  ],
};

type Body = Omit<
  CompositionGeometry,
  "frame" | "decorations" | "stickers" | "background" | "captionText"
>;

function clampNumber(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.round(Math.min(max, Math.max(min, value)));
}

/**
 * One frame under the next, with the caption plate at the foot.
 *
 * A six-photo strip pairs its frames into two columns, as a printed six-cut
 * does, so the strip stays a usable print instead of a sliver; every other
 * count keeps a single column.
 */
function stripBody(
  photoCount: PhotoCount,
  borderWidth: number,
  spacing: number,
  withCaption: boolean,
): Body {
  const columns = photoCount === 6 ? 2 : 1;
  const rows = Math.ceil(photoCount / columns);
  const blockWidth = columns * STRIP_SLOT_WIDTH + (columns - 1) * spacing;

  const slots: Rect[] = Array.from({ length: photoCount }, (_unused, index) => ({
    x: borderWidth + (index % columns) * (STRIP_SLOT_WIDTH + spacing),
    y: borderWidth + Math.floor(index / columns) * (STRIP_SLOT_HEIGHT + spacing),
    width: STRIP_SLOT_WIDTH,
    height: STRIP_SLOT_HEIGHT,
  }));

  const photosHeight = rows * STRIP_SLOT_HEIGHT + (rows - 1) * spacing;
  const captionHeight = withCaption ? CAPTION_HEIGHT : 0;
  const innerHeight =
    photosHeight + (withCaption ? spacing + captionHeight : 0);
  const width = blockWidth + borderWidth * 2;
  const height = innerHeight + borderWidth * 2;

  return {
    width,
    height,
    inner: {
      x: borderWidth,
      y: borderWidth,
      width: blockWidth,
      height: innerHeight,
    },
    slots,
    caption: withCaption
      ? {
          x: borderWidth,
          y: borderWidth + photosHeight + spacing,
          width: blockWidth,
          height: CAPTION_HEIGHT,
        }
      : null,
  };
}

/** A square page with the photo block and caption centred inside it. */
function collageBody(
  photoCount: PhotoCount,
  borderWidth: number,
  spacing: number,
  withCaption: boolean,
): Body {
  const rows = COLLAGE_ROWS[photoCount];
  const columns = rows.reduce((widest, row) => Math.max(widest, row.length), 0);

  const blockWidth =
    columns * COLLAGE_SLOT_WIDTH + (columns - 1) * spacing;
  const photoBlockHeight =
    rows.length * COLLAGE_SLOT_HEIGHT + (rows.length - 1) * spacing;
  const blockHeight =
    photoBlockHeight + (withCaption ? spacing + CAPTION_HEIGHT : 0);

  // The page is square and wide enough for the widest row or the whole block,
  // whichever needs more room. Photos stay centred inside it.
  const side = Math.max(blockWidth, blockHeight) + borderWidth * 2;
  const reserveX = Math.round((side - blockWidth) / 2);
  const reserveY = Math.round((side - blockHeight) / 2);

  const slots: Rect[] = new Array(photoCount);

  rows.forEach((row, rowIndex) => {
    const rowWidth =
      row.length * COLLAGE_SLOT_WIDTH + (row.length - 1) * spacing;
    const rowX = Math.round((side - rowWidth) / 2);
    const rowY = reserveY + rowIndex * (COLLAGE_SLOT_HEIGHT + spacing);

    row.forEach((slotIndex, columnIndex) => {
      slots[slotIndex] = {
        x: rowX + columnIndex * (COLLAGE_SLOT_WIDTH + spacing),
        y: rowY,
        width: COLLAGE_SLOT_WIDTH,
        height: COLLAGE_SLOT_HEIGHT,
      };
    });
  });

  return {
    width: side,
    height: side,
    inner: {
      x: borderWidth,
      y: borderWidth,
      width: side - borderWidth * 2,
      height: side - borderWidth * 2,
    },
    slots,
    caption: withCaption
      ? {
          x: reserveX,
          y: reserveY + photoBlockHeight + spacing,
          width: blockWidth,
          height: CAPTION_HEIGHT,
        }
      : null,
  };
}

/**
 * Where the caption and date sit inside the plate.
 *
 * Both the DOM preview and the canvas renderer read these boxes, so the two
 * never disagree about a single line of text.
 */
function captionTextMetrics(caption: Rect | null): CaptionTextMetrics | null {
  if (!caption) {
    return null;
  }

  const padding = Math.round(caption.width * 0.06);

  return {
    title: {
      x: caption.x + padding,
      y: caption.y + Math.round(caption.height * 0.14),
      width: caption.width - padding * 2,
      height: Math.round(caption.height * 0.42),
      fontSize: Math.max(16, Math.round(caption.height * 0.34)),
    },
    date: {
      x: caption.x + padding,
      y: caption.y + Math.round(caption.height * 0.6),
      width: caption.width - padding * 2,
      height: Math.round(caption.height * 0.26),
      fontSize: Math.max(10, Math.round(caption.height * 0.17)),
    },
  };
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

/** A template's own paper unless the editor chose a valid colour. */
function resolveBackground(value: string | undefined, fallback: string): string {
  return typeof value === "string" && HEX_COLOUR.test(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Turns the editor's fractional sticker placements into page rectangles.
 *
 * A sticker's centre is stored as a fraction, so it keeps its spot when the
 * spacing or frame thickness changes the composition's size. The square itself
 * is clamped inside the page, which is what stops a sticker from being dragged
 * off the printable area.
 */
function placeUserStickers(
  stickers: readonly StickerPlacement[] | undefined,
  width: number,
  height: number,
): PlacedSticker[] {
  if (!stickers || stickers.length === 0) {
    return [];
  }

  return stickers.slice(0, MAX_USER_STICKERS).flatMap((entry) => {
    if (!isStickerKey(entry.sticker)) {
      return [];
    }

    const sticker = getSticker(entry.sticker);
    const size = Math.round(
      width *
        clamp(
          Number.isFinite(entry.size) ? entry.size : 0.14,
          MIN_STICKER_SIZE,
          MAX_STICKER_SIZE,
        ),
    );
    const centreX = clamp(
      Number.isFinite(entry.x) ? entry.x : 0.5,
      0,
      1,
    ) * width;
    const centreY = clamp(
      Number.isFinite(entry.y) ? entry.y : 0.5,
      0,
      1,
    ) * height;

    return [
      {
        ...entry,
        glyph: sticker.glyph,
        left: Math.round(clamp(centreX - size / 2, 0, width - size)),
        top: Math.round(clamp(centreY - size / 2, 0, height - size)),
        side: size,
        rotate: Number.isFinite(entry.rotate) ? entry.rotate : 0,
      },
    ];
  });
}

/** Places a template's decorations inside the frame band, never over photos. */
function placeDecorations(
  decor: readonly BorderDecoration[],
  width: number,
  height: number,
  borderWidth: number,
): PlacedDecoration[] {
  const edge = borderWidth / 2;

  return decor.map((entry) => {
    const sticker = getSticker(entry.sticker);
    const size = Math.max(10, Math.round(borderWidth * entry.scale));
    let x = 0;
    let y = 0;

    switch (entry.at) {
      case "top-left":
        x = edge - size / 2;
        y = edge - size / 2;
        break;
      case "top-center":
        x = width / 2 - size / 2;
        y = edge - size / 2;
        break;
      case "top-right":
        x = width - edge - size / 2;
        y = edge - size / 2;
        break;
      case "bottom-left":
        x = edge - size / 2;
        y = height - edge - size / 2;
        break;
      case "bottom-center":
        x = width / 2 - size / 2;
        y = height - edge - size / 2;
        break;
      case "bottom-right":
        x = width - edge - size / 2;
        y = height - edge - size / 2;
        break;
    }

    return {
      sticker: sticker.key,
      glyph: sticker.glyph,
      x: Math.round(Math.min(width - size - 2, Math.max(2, x))),
      y: Math.round(Math.min(height - size - 2, Math.max(2, y))),
      size,
      rotate: entry.rotate ?? 0,
    };
  });
}

/**
 * Every rectangle the booth needs for one setup choice.
 *
 * Deterministic: the same config always produces the same geometry, which is
 * what lets the preview and the exported image agree.
 */
export function composeBooth(config: CompositionConfig): CompositionGeometry {
  const borderWidth = clampNumber(
    config.borderWidth,
    DEFAULT_BORDER_WIDTH,
    MIN_BORDER_WIDTH,
    MAX_BORDER_WIDTH,
  );
  const spacing = clampNumber(
    config.spacing,
    DEFAULT_SPACING,
    MIN_SPACING,
    MAX_SPACING,
  );
  const withCaption = config.caption ?? true;
  const template = getBorderTemplate(config.borderKey);

  const body =
    config.layout === "collage"
      ? collageBody(config.photoCount, borderWidth, spacing, withCaption)
      : stripBody(config.photoCount, borderWidth, spacing, withCaption);

  return {
    ...body,
    frame: { x: 0, y: 0, width: body.width, height: body.height },
    captionText: captionTextMetrics(body.caption),
    decorations: placeDecorations(
      template.decor,
      body.width,
      body.height,
      borderWidth,
    ),
    background: resolveBackground(config.background, template.frame),
    stickers: placeUserStickers(config.stickers, body.width, body.height),
  };
}
