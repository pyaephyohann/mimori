import type { BorderTemplate } from "@/lib/photo-booth/borders";
import {
  DOT_OFFSET,
  DOT_OPACITY,
  DOT_RADIUS,
  DOT_TILE,
  RULE_OPACITY,
  RULE_THICKNESS,
  RULE_TILE,
  RULE_TOP,
  SPROCKET_HOLE_HEIGHT,
  SPROCKET_HOLE_RADIUS,
  SPROCKET_HOLE_TOP,
  SPROCKET_HOLE_WIDTH,
  SPROCKET_HOLE_X,
  SPROCKET_OPACITY,
  SPROCKET_TILE,
  sprocketBands,
} from "@/lib/photo-booth/patterns";

type PatternProps = {
  template: BorderTemplate;
  /** Unique per rendered preview, so two SVGs never share a pattern id. */
  patternId: string;
};

/**
 * The `<defs>` half of a paper texture: one pattern for dots or rules, and one
 * for film sprockets. The frame itself is painted by its consumer, because the
 * setup miniature and the editor preview clip it differently.
 */
export function PaperPatternDefs({ template, patternId }: PatternProps) {
  if (template.pattern === "dots") {
    return (
      <defs>
        <pattern
          id={patternId}
          width={DOT_TILE}
          height={DOT_TILE}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={DOT_OFFSET}
            cy={DOT_OFFSET}
            r={DOT_RADIUS}
            fill={template.patternColor}
          />
        </pattern>
      </defs>
    );
  }

  if (template.pattern === "ruled") {
    return (
      <defs>
        <pattern
          id={patternId}
          width={RULE_TILE}
          height={RULE_TILE}
          patternUnits="userSpaceOnUse"
        >
          <rect
            x="0"
            y={RULE_TOP}
            width={RULE_TILE}
            height={RULE_THICKNESS}
            fill={template.patternColor}
          />
        </pattern>
      </defs>
    );
  }

  if (template.pattern === "sprockets") {
    return (
      <defs>
        <pattern
          id={patternId}
          width={SPROCKET_TILE}
          height={DOT_TILE}
          patternUnits="userSpaceOnUse"
        >
          <rect
            x={SPROCKET_HOLE_X}
            y={SPROCKET_HOLE_TOP}
            width={SPROCKET_HOLE_WIDTH}
            height={SPROCKET_HOLE_HEIGHT}
            rx={SPROCKET_HOLE_RADIUS}
            fill={template.patternColor}
          />
        </pattern>
      </defs>
    );
  }

  return null;
}

type PaintProps = PatternProps & {
  width: number;
  height: number;
  borderWidth: number;
  /** Corner radius for the wash; the editor preview clips itself instead. */
  radius?: number;
  /** Keeps a miniature's hairline edge visible around the wash. */
  inset?: number;
};

/**
 * The painted half: the dots/rules wash and the two film bands, at the sizes
 * the canvas renderer uses. Draw it above the frame paper and below the photos.
 */
export function PaperPatternPaint({
  template,
  patternId,
  width,
  height,
  borderWidth,
  radius = 0,
  inset = 0,
}: PaintProps) {
  if (template.pattern === "dots" || template.pattern === "ruled") {
    return (
      <rect
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        rx={radius}
        fill={`url(#${patternId})`}
        opacity={template.pattern === "dots" ? DOT_OPACITY : RULE_OPACITY}
      />
    );
  }

  if (template.pattern === "sprockets") {
    return (
      <>
        {sprocketBands(height, borderWidth).map((band) => (
          <rect
            key={band.y}
            x={0}
            y={band.y}
            width={width}
            height={band.height}
            fill={`url(#${patternId})`}
            opacity={SPROCKET_OPACITY}
          />
        ))}
      </>
    );
  }

  return null;
}
