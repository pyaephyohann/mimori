/**
 * The paper pattern measurements.
 *
 * The SVG previews and the canvas renderer draw the same dots, rules and film
 * sprockets; keeping the numbers here means a pattern cannot look one way on
 * screen and another in the exported print.
 *
 * All values are composition units — the same unit the geometry speaks.
 */

export const DOT_TILE = 26;
export const DOT_OFFSET = 7;
export const DOT_RADIUS = 3.4;
export const DOT_OPACITY = 0.55;

export const RULE_TILE = 34;
export const RULE_TOP = 29;
export const RULE_THICKNESS = 2.2;
export const RULE_OPACITY = 0.8;

export const SPROCKET_TILE = 44;
export const SPROCKET_HOLE_X = 4;
export const SPROCKET_HOLE_WIDTH = 20;
export const SPROCKET_HOLE_HEIGHT = 8;
export const SPROCKET_HOLE_RADIUS = 2;
/** Where the hole sits inside its pattern tile. */
export const SPROCKET_HOLE_TOP = 7;
export const SPROCKET_OPACITY = 0.9;

export type SprocketBand = {
  y: number;
  height: number;
};

/** The two film bands, measured from the frame's thickness. */
export function sprocketBands(height: number, borderWidth: number): SprocketBand[] {
  const bandHeight = Math.round(borderWidth * 0.24);

  return [
    { y: Math.round(borderWidth * 0.2), height: bandHeight },
    { y: height - Math.round(borderWidth * 0.44), height: bandHeight },
  ];
}
