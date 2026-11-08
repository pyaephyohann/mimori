"use client";

import { useId } from "react";

import { getBorderTemplate, type BorderKey } from "@/lib/photo-booth/borders";
import type { BoothLayout, PhotoCount } from "@/lib/photo-booth/catalog";
import { composeBooth } from "@/lib/photo-booth/compose";

import { PaperPatternDefs, PaperPatternPaint } from "./paper-pattern";

type BorderPreviewProps = {
  borderKey: BorderKey;
  photoCount: PhotoCount;
  layout: BoothLayout;
  /** Reserve the caption plate; off in the examples, on in a finished print. */
  caption?: boolean;
  className?: string;
};

/**
 * A miniature of the real composition.
 *
 * The rectangles come from `composeBooth`, so this is not a decorative
 * approximation: it is the same frame, slots, caption plate and decorations the
 * camera and editor steps will use, drawn as SVG. SVG keeps its proportions at
 * every card size without layout maths, and its shapes map one-to-one onto the
 * future canvas exporter.
 *
 * The frame is painted from the template's own colours and pattern, so each
 * border looks distinct instead of sharing one card with a new title.
 */
export function BorderPreview({
  borderKey,
  photoCount,
  layout,
  caption = false,
  className = "",
}: BorderPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const template = getBorderTemplate(borderKey);
  const geometry = composeBooth({
    photoCount,
    layout,
    borderKey,
    caption,
  });

  const { width, height, slots, decorations } = geometry;
  const borderWidth = geometry.inner.x;
  const radius = Math.round(width * 0.025);
  const inset = 1;

  const patternId = `${uid}-pattern`;
  const photoId = `${uid}-photo`;
  const captionRect = geometry.caption;

  return (
    <svg
      role="img"
      aria-label={`${template.title} border, ${photoCount} photos, ${
        layout === "strip" ? "vertical strip" : "square collage"
      }`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`block h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={photoId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF8FA" />
          <stop offset="55%" stopColor="#F9E1EA" />
          <stop offset="100%" stopColor="#E88EAD" />
        </linearGradient>
      </defs>

      <PaperPatternDefs template={template} patternId={patternId} />

      {/* Frame paper, with the template's own edge hairline. */}
      <rect
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        rx={radius}
        fill={template.frame}
        stroke={template.edge}
        strokeWidth="2"
      />

      <PaperPatternPaint
        template={template}
        patternId={patternId}
        width={width}
        height={height}
        borderWidth={borderWidth}
        radius={radius}
        inset={inset}
      />

      {/* Photo slots: empty until the camera step fills them. */}
      {slots.map((slot, index) => (
        <g key={`slot-${index}`} aria-hidden="true">
          <rect
            x={slot.x}
            y={slot.y}
            width={slot.width}
            height={slot.height}
            rx={Math.round(slot.width * 0.015)}
            fill={`url(#${photoId})`}
            stroke="#FFFFFF"
            strokeOpacity={0.75}
            strokeWidth="2"
          />
          <text
            x={slot.x + slot.width / 2}
            y={slot.y + slot.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.round(slot.width * 0.16)}
            fill="#FFFFFF"
            fillOpacity={0.7}
          >
            ♥
          </text>
        </g>
      ))}

      {captionRect ? (
        <g aria-hidden="true">
          <rect
            x={captionRect.x}
            y={captionRect.y}
            width={captionRect.width}
            height={captionRect.height}
            rx={Math.round(captionRect.width * 0.015)}
            fill={template.caption.plate}
            stroke={template.edge}
            strokeOpacity={0.35}
            strokeWidth="1.5"
          />
          <rect
            x={captionRect.x + captionRect.width * 0.28}
            y={captionRect.y + captionRect.height * 0.3}
            width={captionRect.width * 0.44}
            height={captionRect.height * 0.12}
            rx={captionRect.height * 0.06}
            fill={template.caption.color}
            opacity={0.3}
          />
          <rect
            x={captionRect.x + captionRect.width * 0.35}
            y={captionRect.y + captionRect.height * 0.55}
            width={captionRect.width * 0.3}
            height={captionRect.height * 0.09}
            rx={captionRect.height * 0.045}
            fill={template.caption.color}
            opacity={0.22}
          />
        </g>
      ) : null}

      {/* The template's corners, placed by the geometry, never over a photo. */}
      {decorations.map((decoration, index) => {
        const centreX = decoration.x + decoration.size / 2;
        const centreY = decoration.y + decoration.size / 2;

        return (
          <text
            key={`${decoration.sticker}-${index}`}
            aria-hidden="true"
            x={centreX}
            y={centreY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={decoration.size}
            transform={`rotate(${decoration.rotate} ${centreX} ${centreY})`}
          >
            {decoration.glyph}
          </text>
        );
      })}
    </svg>
  );
}
