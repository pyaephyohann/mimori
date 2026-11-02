/**
 * The widget catalogue.
 *
 * Shared by the browser (style picker, previews) and the server (validation),
 * so it contains no React, no database code and no photo imports. Photo
 * references are ids from `lib/photos.ts`, the gallery's own manifest.
 */

export type WidgetKind =
  | "polaroid"
  | "photo-grid"
  | "film-strip"
  | "heart-collage"
  | "photo-stack"
  | "memory-frame"
  | "love-note"
  | "our-counter";

export type WidgetSize = "sm" | "md" | "lg";

export type WidgetGroup = "photo" | "romantic";

export type WidgetPosition = {
  x: number;
  y: number;
};

/**
 * Everything a widget needs to render. Stored in `Widget.config`, so new
 * fields need no migration.
 */
export type WidgetConfig = {
  kind: WidgetKind;
  /** Manifest ids (`lib/photos.ts`) in display order. */
  photoIds: string[];
  /** Love Note copy, or a short optional caption for the framed widgets. */
  text: string;
  /** `YYYY-MM-DD` start date for Our Counter; empty when unset. */
  date: string;
  position: WidgetPosition;
  size: WidgetSize;
  /** Painter's order: higher sits in front. */
  z: number;
};

export type WidgetRecord = {
  id: string;
  name: string;
  kind: WidgetKind;
  config: WidgetConfig;
  createdAt: string;
  updatedAt: string;
};

export const WIDGET_SIZES: readonly WidgetSize[] = ["sm", "md", "lg"];

/** Desktop pixel footprint of each size preset. */
export const SIZE_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  sm: { width: 208, height: 228 },
  md: { width: 288, height: 268 },
  lg: { width: 384, height: 320 },
};

export const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};

/** Soft grid the canvas snaps to, in CSS pixels. */
export const SNAP_GRID = 16;

/** Largest accepted coordinate, so a malformed payload cannot place a widget
 *  thousands of pixels away. */
export const MAX_COORDINATE = 4096;

export const MAX_TEXT_LENGTH = 280;

export type CatalogEntry = {
  kind: WidgetKind;
  title: string;
  blurb: string;
  group: WidgetGroup;
  minPhotos: number;
  maxPhotos: number;
  defaultSize: WidgetSize;
  /** Prefilled copy for the romantic widgets. */
  defaultText?: string;
};

export const WIDGET_CATALOG: readonly CatalogEntry[] = [
  {
    kind: "polaroid",
    title: "Polaroid",
    blurb: "One featured photo in a paper frame, with its handwritten caption.",
    group: "photo",
    minPhotos: 1,
    maxPhotos: 1,
    defaultSize: "md",
  },
  {
    kind: "photo-grid",
    title: "Photo Grid",
    blurb: "A tidy little grid of favourite moments, two to six photos.",
    group: "photo",
    minPhotos: 2,
    maxPhotos: 6,
    defaultSize: "lg",
  },
  {
    kind: "film-strip",
    title: "Film Strip",
    blurb: "A strip of frames with sprocket holes, like a roll of film.",
    group: "photo",
    minPhotos: 3,
    maxPhotos: 6,
    defaultSize: "lg",
  },
  {
    kind: "heart-collage",
    title: "Heart Collage",
    blurb: "Three to five photos tucked into a heart-shaped arrangement.",
    group: "photo",
    minPhotos: 3,
    maxPhotos: 5,
    defaultSize: "md",
  },
  {
    kind: "photo-stack",
    title: "Photo Stack",
    blurb: "Overlapping polaroids scattered like a pile on a desk.",
    group: "photo",
    minPhotos: 2,
    maxPhotos: 4,
    defaultSize: "md",
  },
  {
    kind: "memory-frame",
    title: "Memory Frame",
    blurb: "A single photo inside a decorative frame with a caption plate.",
    group: "photo",
    minPhotos: 1,
    maxPhotos: 1,
    defaultSize: "md",
  },
  {
    kind: "love-note",
    title: "Love Note",
    blurb: "A handwritten note on paper, with a bow and a scattering of hearts.",
    group: "romantic",
    minPhotos: 0,
    maxPhotos: 0,
    defaultSize: "sm",
    defaultText: "You are my favourite place to be.",
  },
  {
    kind: "our-counter",
    title: "Our Counter",
    blurb: "How many days it has been since the day you count from.",
    group: "romantic",
    minPhotos: 0,
    maxPhotos: 0,
    defaultSize: "sm",
  },
];

export const WIDGET_KINDS: readonly WidgetKind[] = WIDGET_CATALOG.map(
  (entry) => entry.kind,
);

export function getCatalogEntry(kind: WidgetKind): CatalogEntry {
  const entry = WIDGET_CATALOG.find((candidate) => candidate.kind === kind);

  if (!entry) {
    throw new Error(`Unknown widget kind: ${kind}`);
  }

  return entry;
}

export function isWidgetKind(value: unknown): value is WidgetKind {
  return (
    typeof value === "string" &&
    (WIDGET_KINDS as readonly string[]).includes(value)
  );
}

export function isWidgetSize(value: unknown): value is WidgetSize {
  return typeof value === "string" && WIDGET_SIZES.includes(value as WidgetSize);
}

/** Rounds a coordinate to the soft grid. */
export function snapToGrid(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

export function clampCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_COORDINATE, Math.max(0, Math.round(value)));
}

/**
 * Days between a `YYYY-MM-DD` date and today, in whole days.
 *
 * Parsed at UTC midnight on both sides so a daylight-saving change cannot shift
 * the count by one. Returns `null` for an empty or unparseable date.
 */
export function daysSince(date: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const start = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}
