/**
 * Canvas geometry.
 *
 * Pure functions so the placement rules can be tested without a browser: the
 * canvas measures itself and calls these, and the server stores the resulting
 * grid-aligned coordinates.
 */

import { SNAP_GRID, clampCoordinate, type WidgetPosition } from "./catalog.ts";

export type WidgetBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Breathing room kept between two widgets, in pixels. */
export const WIDGET_GAP = 12;

/** Fallback canvas width before the browser has measured the real one. */
export const DEFAULT_CANVAS_WIDTH = 1200;

export function boxesOverlap(a: WidgetBox, b: WidgetBox, gap = WIDGET_GAP): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

function snap(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

/** Keeps a widget fully inside the canvas, aligned to the grid. */
export function clampToCanvas(
  position: WidgetPosition,
  size: { width: number; height: number },
  canvasWidth: number,
): WidgetPosition {
  const maxX = Math.max(0, canvasWidth - size.width);

  // Snap first, then clamp: snapping an already-clamped far-right coordinate
  // could push the widget past the edge again.
  return {
    x: Math.min(snap(clampCoordinate(position.x)), maxX),
    y: snap(clampCoordinate(position.y)),
  };
}

export function boxAt(
  position: WidgetPosition,
  size: { width: number; height: number },
): WidgetBox {
  return { x: position.x, y: position.y, width: size.width, height: size.height };
}

function isFree(
  box: WidgetBox,
  occupied: readonly WidgetBox[],
): boolean {
  return !occupied.some((other) => boxesOverlap(box, other));
}

/**
 * The empty slot closest to `desired`. Used for a brand-new widget and for a
 * drop that would land on top of an existing one, so widgets never stack by
 * accident. Falls back to the desired spot when the canvas is full.
 */
export function settlePosition(
  desired: WidgetPosition,
  size: { width: number; height: number },
  occupied: readonly WidgetBox[],
  canvasWidth: number,
): WidgetPosition {
  const base = clampToCanvas(desired, size, canvasWidth);

  if (isFree(boxAt(base, size), occupied)) {
    return base;
  }

  const maxX = Math.max(0, canvasWidth - size.width);
  let best: WidgetPosition | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let y = 0; y <= 2400; y += SNAP_GRID) {
    for (let x = 0; x <= maxX; x += SNAP_GRID) {
      if (!isFree(boxAt({ x, y }, size), occupied)) {
        continue;
      }

      const distance = (x - base.x) ** 2 + (y - base.y) ** 2;

      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, y };
      }
    }
  }

  return best ?? base;
}

/** Tallest point any widget reaches, so the canvas reserves enough room. */
export function contentHeight(boxes: readonly WidgetBox[], minimum = 360): number {
  return boxes.reduce(
    (height, box) => Math.max(height, box.y + box.height + SNAP_GRID),
    minimum,
  );
}
