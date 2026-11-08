/**
 * The photobooth border templates.
 *
 * Every border is data, not a screen: the setup previews, the future camera
 * step, the editor and the canvas exporter all read this one catalogue. Values
 * are concrete colours and numbers (never Tailwind classes), so a template can
 * be painted by a DOM preview now and by `canvas` later without redefining it.
 *
 * The palette is the existing brand palette; no new pink is introduced.
 */

import type { StickerKey } from "./stickers.ts";

export const BORDER_KEYS = [
  "lovely-hearts",
  "minimal-white",
  "vintage-film",
  "flower-garden",
  "kawaii-stickers",
  "love-letter",
] as const;

export type BorderKey = (typeof BORDER_KEYS)[number];

export const DEFAULT_BORDER_KEY: BorderKey = "lovely-hearts";

export type BorderPattern = "none" | "sprockets" | "dots" | "ruled";

export type DecorationAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type BorderDecoration = {
  sticker: StickerKey;
  at: DecorationAnchor;
  /** Size relative to the frame thickness. */
  scale: number;
  /** Degrees of scrapbook tilt. */
  rotate?: number;
};

export type BorderTemplate = {
  key: BorderKey;
  title: string;
  blurb: string;
  /** Paper colour of the frame. */
  frame: string;
  /** Hairline around the whole composition. */
  edge: string;
  /** Ink for small accents. */
  accent: string;
  pattern: BorderPattern;
  patternColor: string;
  caption: {
    /** Paper the caption and date are written on. */
    plate: string;
    color: string;
  };
  decor: readonly BorderDecoration[];
};

export const BORDER_CATALOG: readonly BorderTemplate[] = [
  {
    key: "lovely-hearts",
    title: "Lovely Hearts",
    blurb: "A blush-pink frame with little hearts tucked into the corners.",
    frame: "#F9E1EA",
    edge: "#E88EAD",
    accent: "#F02E8D",
    pattern: "none",
    patternColor: "#FFFFFF",
    caption: { plate: "#FFF8FA", color: "#49343D" },
    decor: [
      { sticker: "heart", at: "top-left", scale: 0.7, rotate: -12 },
      { sticker: "heart", at: "top-right", scale: 0.5, rotate: 10 },
      { sticker: "heart", at: "bottom-center", scale: 0.45, rotate: -4 },
    ],
  },
  {
    key: "minimal-white",
    title: "Minimal White",
    blurb: "Clean white paper, quiet edges and hardly any decoration.",
    frame: "#FFFFFF",
    edge: "#F0CDDB",
    accent: "#C77B91",
    pattern: "none",
    patternColor: "#F9E1EA",
    caption: { plate: "#FFFFFF", color: "#49343D" },
    decor: [{ sticker: "heart", at: "bottom-right", scale: 0.4, rotate: 6 }],
  },
  {
    key: "vintage-film",
    title: "Vintage Film",
    blurb: "Warm charcoal stock with film sprockets down the sides.",
    frame: "#49343D",
    edge: "#6E5862",
    accent: "#FFF8FA",
    pattern: "sprockets",
    patternColor: "#FFF8FA",
    caption: { plate: "#FFF8FA", color: "#49343D" },
    decor: [{ sticker: "sparkle", at: "top-right", scale: 0.42, rotate: 8 }],
  },
  {
    key: "flower-garden",
    title: "Flower Garden",
    blurb: "Soft pastel paper scattered with blossoms and daisies.",
    frame: "#FFF8FA",
    edge: "#E88EAD",
    accent: "#C77B91",
    pattern: "dots",
    patternColor: "#F9E1EA",
    caption: { plate: "#F9E1EA", color: "#49343D" },
    decor: [
      { sticker: "blossom", at: "top-left", scale: 0.6, rotate: -8 },
      { sticker: "daisy", at: "bottom-right", scale: 0.55, rotate: 6 },
      { sticker: "blossom", at: "bottom-left", scale: 0.4, rotate: 12 },
    ],
  },
  {
    key: "kawaii-stickers",
    title: "Kawaii Stickers",
    blurb: "Playful rose paper with a scattering of tiny stickers.",
    frame: "#E88EAD",
    edge: "#F02E8D",
    accent: "#FFF8FA",
    pattern: "dots",
    patternColor: "#FFFFFF",
    caption: { plate: "#FFF8FA", color: "#49343D" },
    decor: [
      { sticker: "strawberry", at: "top-left", scale: 0.6, rotate: -8 },
      { sticker: "star", at: "top-right", scale: 0.45, rotate: 10 },
      { sticker: "bunny", at: "bottom-left", scale: 0.55, rotate: -6 },
      { sticker: "bow", at: "bottom-right", scale: 0.5, rotate: 8 },
    ],
  },
  {
    key: "love-letter",
    title: "Love Letter",
    blurb: "Cream and pink letter paper with a little envelope seal.",
    frame: "#FFF8FA",
    edge: "#E88EAD",
    accent: "#C77B91",
    pattern: "ruled",
    patternColor: "#F9E1EA",
    caption: { plate: "#F9E1EA", color: "#49343D" },
    decor: [
      { sticker: "letter", at: "top-center", scale: 0.55, rotate: -4 },
      { sticker: "heart", at: "bottom-right", scale: 0.45, rotate: 8 },
    ],
  },
];

const BORDERS_BY_KEY = new Map<string, BorderTemplate>(
  BORDER_CATALOG.map((template) => [template.key, template]),
);

export function isBorderKey(value: unknown): value is BorderKey {
  return typeof value === "string" && BORDERS_BY_KEY.has(value);
}

export function getBorderTemplate(key: BorderKey): BorderTemplate {
  const template = BORDERS_BY_KEY.get(key);

  if (!template) {
    throw new Error(`Unknown photobooth border: ${key}`);
  }

  return template;
}
