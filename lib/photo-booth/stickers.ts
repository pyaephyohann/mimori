/**
 * The photobooth sticker palette.
 *
 * One registry for every cute glyph the booth can place: the border templates
 * use it for their own decorations, and the post-capture editor will offer the
 * same list. Stickers are emoji, matching `BowSticker`, so no icon dependency
 * is added and a composition can store only a key plus a position.
 */

export const STICKERS = [
  { key: "bow", glyph: "🎀", label: "Bow" },
  { key: "heart", glyph: "💖", label: "Heart" },
  { key: "blossom", glyph: "🌸", label: "Blossom" },
  { key: "daisy", glyph: "🌼", label: "Daisy" },
  { key: "strawberry", glyph: "🍓", label: "Strawberry" },
  { key: "star", glyph: "⭐", label: "Star" },
  { key: "bunny", glyph: "🐰", label: "Bunny" },
  { key: "letter", glyph: "💌", label: "Love letter" },
  { key: "sparkle", glyph: "✨", label: "Sparkle" },
] as const;

export type Sticker = (typeof STICKERS)[number];

export type StickerKey = Sticker["key"];

const STICKERS_BY_KEY = new Map<string, Sticker>(
  STICKERS.map((sticker) => [sticker.key, sticker]),
);

export function isStickerKey(value: unknown): value is StickerKey {
  return typeof value === "string" && STICKERS_BY_KEY.has(value);
}

export function getSticker(key: StickerKey): Sticker {
  const sticker = STICKERS_BY_KEY.get(key);

  if (!sticker) {
    throw new Error(`Unknown photobooth sticker: ${key}`);
  }

  return sticker;
}
