/**
 * The photobooth paper swatches.
 *
 * The editor can repaint the frame's paper without replacing the border
 * template, so a print keeps its pattern, edge, decorations and caption plate
 * while the paper behind them changes. Colours are concrete HEX values from the
 * existing brand palette, readable by both the DOM preview and `canvas`.
 *
 * `null` means "keep the border's own paper" and is the default, so a template
 * always opens looking the way it was designed.
 */

export const BACKGROUNDS = [
  { key: "blush", title: "Blush pink", color: "#F9E1EA" },
  { key: "cream", title: "Cream", color: "#FFF6E9" },
  { key: "lavender", title: "Lavender", color: "#EFE7FB" },
  { key: "baby-blue", title: "Baby blue", color: "#E7F2FB" },
  { key: "butter", title: "Butter yellow", color: "#FFF4C9" },
  { key: "white", title: "Paper white", color: "#FFFFFF" },
] as const;

export type Background = (typeof BACKGROUNDS)[number];

export type BackgroundKey = Background["key"];

export const BACKGROUND_KEYS: readonly BackgroundKey[] = BACKGROUNDS.map(
  (background) => background.key,
);

const BACKGROUNDS_BY_KEY = new Map<string, Background>(
  BACKGROUNDS.map((background) => [background.key, background]),
);

export function isBackgroundKey(value: unknown): value is BackgroundKey {
  return typeof value === "string" && BACKGROUNDS_BY_KEY.has(value);
}

export function getBackground(key: BackgroundKey): Background {
  const background = BACKGROUNDS_BY_KEY.get(key);

  if (!background) {
    throw new Error(`Unknown photobooth background: ${key}`);
  }

  return background;
}

/** The swatch colour, or null when the border template supplies its own. */
export function backgroundColour(key: BackgroundKey | null): string | null {
  return key ? getBackground(key).color : null;
}
