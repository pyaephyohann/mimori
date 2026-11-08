/**
 * The photobooth catalogue.
 *
 * Shared by the setup screen, the camera step, the editor and the final
 * renderer, so it contains no React, no DOM and no database code. Photo counts
 * are a fixed set of choices rather than a free-form number, which is why the
 * setup screen can use selection cards instead of an input.
 */

export const PHOTO_COUNTS = [2, 3, 4, 6] as const;

export type PhotoCount = (typeof PHOTO_COUNTS)[number];

export const DEFAULT_PHOTO_COUNT: PhotoCount = 4;

export type BoothLayout = "strip" | "collage";

export const BOOTH_LAYOUTS: readonly BoothLayout[] = ["strip", "collage"];

export const DEFAULT_BOOTH_LAYOUT: BoothLayout = "strip";

export type PhotoCountOption = {
  count: PhotoCount;
  title: string;
  blurb: string;
  badge?: string;
};

export const PHOTO_COUNT_OPTIONS: readonly PhotoCountOption[] = [
  { count: 2, title: "2 photos", blurb: "Two frames, one little moment." },
  { count: 3, title: "3 photos", blurb: "A short story in three." },
  {
    count: 4,
    title: "4 photos",
    blurb: "The classic four-cut.",
    badge: "Favourite",
  },
  { count: 6, title: "6 photos", blurb: "A whole page of us." },
];

export type LayoutOption = {
  layout: BoothLayout;
  title: string;
  blurb: string;
  badge?: string;
};

export const LAYOUT_OPTIONS: readonly LayoutOption[] = [
  {
    layout: "strip",
    title: "Vertical strip",
    blurb: "Korean-booth style: one frame under the next.",
    badge: "Classic",
  },
  {
    layout: "collage",
    title: "Square collage",
    blurb: "A square page with the photos tucked into a grid.",
  },
];

export function isPhotoCount(value: unknown): value is PhotoCount {
  return (
    typeof value === "number" &&
    (PHOTO_COUNTS as readonly number[]).includes(value)
  );
}

export function isBoothLayout(value: unknown): value is BoothLayout {
  return (
    typeof value === "string" &&
    (BOOTH_LAYOUTS as readonly string[]).includes(value)
  );
}
