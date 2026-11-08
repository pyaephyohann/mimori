"use client";

import { useId, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { BorderTemplate } from "@/lib/photo-booth/borders";
import type { CompositionGeometry } from "@/lib/photo-booth/compose";
import { fitCaptionSize } from "@/lib/photo-booth/editor";
import { getSticker } from "@/lib/photo-booth/stickers";

import { PaperPatternDefs, PaperPatternPaint } from "./paper-pattern";

/** The only thing the print needs from a photo: a URL to draw. */
export type PreviewPhoto = { url: string };

type CompositionPreviewProps = {
  geometry: CompositionGeometry;
  template: BorderTemplate;
  /**
   * One photo per slot, in print order: a fresh capture's object URL or a saved
   * session's Cloudinary URL. Missing slots show the paper.
   */
  photos: readonly (PreviewPhoto | null)[];
  caption: string;
  date: string;
  selectedStickerId?: string | null;
  onSelectSticker?: (id: string | null) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  className?: string;
  /** Announced with the preview; the editor and the review word it differently. */
  label?: string;
};

function percent(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

/** Composition units → container-query width units, for type and icons. */
function cqw(value: number, width: number): string {
  return `${(value / width) * 100}cqw`;
}

/**
 * The live print.
 *
 * Everything drawn here comes from `composeBooth`, so the frame, slots, caption
 * plate, decorations and stickers sit exactly where the canvas renderer will
 * put them. Photos are the session's own captures; the editor only reads them.
 *
 * When a move handler is supplied the stickers become draggable (pointer and
 * arrow keys), which is an editor-only affordance; the same component renders a
 * still print elsewhere.
 */
export function CompositionPreview({
  geometry,
  template,
  photos,
  caption,
  date,
  selectedStickerId = null,
  onSelectSticker,
  onMoveSticker,
  className = "",
  label,
}: CompositionPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const patternId = `${uid}-paper`;
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(
    null,
  );

  const { width, height, caption: plate, captionText } = geometry;
  const radius = width * 0.025;
  const title = caption.trim();
  const titleSize = captionText
    ? fitCaptionSize(title, captionText.title.fontSize, captionText.title.width)
    : 0;
  const interactive = typeof onMoveSticker === "function";

  const moveTo = (id: string, clientX: number, clientY: number) => {
    const frame = frameRef.current;

    if (!frame || !onMoveSticker) {
      return;
    }

    const bounds = frame.getBoundingClientRect();
    const x = (clientX - bounds.left) / bounds.width;
    const y = (clientY - bounds.top) / bounds.height;

    onMoveSticker(id, x, y);
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
    stickerX: number,
    stickerY: number,
  ) => {
    if (!interactive) {
      return;
    }

    const frame = frameRef.current;

    onSelectSticker?.(id);

    if (!frame) {
      return;
    }

    const bounds = frame.getBoundingClientRect();

    dragRef.current = {
      id,
      offsetX: event.clientX - (bounds.left + stickerX * bounds.width),
      offsetY: event.clientY - (bounds.top + stickerY * bounds.height),
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const dragSticker = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    moveTo(drag.id, event.clientX - drag.offsetX, event.clientY - drag.offsetY);
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const nudge = (event: ReactKeyboardEvent<HTMLButtonElement>, id: string, x: number, y: number) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    let nextX = x;
    let nextY = y;

    switch (event.key) {
      case "ArrowLeft":
        nextX -= step;
        break;
      case "ArrowRight":
        nextX += step;
        break;
      case "ArrowUp":
        nextY -= step;
        break;
      case "ArrowDown":
        nextY += step;
        break;
      default:
        return;
    }

    event.preventDefault();
    onMoveSticker?.(id, Math.min(1, Math.max(0, nextX)), Math.min(1, Math.max(0, nextY)));
  };

  return (
    <div
      ref={frameRef}
      role={interactive ? "group" : "img"}
      aria-label={
        label ??
        `Photobooth print with ${photos.length} ${photos.length === 1 ? "photo" : "photos"}`
      }
      className={`relative overflow-hidden bg-paper ${className}`}
      style={{
        aspectRatio: `${width} / ${height}`,
        containerType: "inline-size",
        borderRadius: "2.5%",
        boxShadow: "0 22px 44px -30px rgba(73, 52, 61, 0.9)",
        border: `1px solid ${template.edge}`,
        backgroundColor: geometry.background,
      }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <PaperPatternDefs template={template} patternId={patternId} />
        <PaperPatternPaint
          template={template}
          patternId={patternId}
          width={width}
          height={height}
          borderWidth={geometry.inner.x}
        />
        <rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          rx={radius}
          fill="none"
          stroke={template.edge}
          strokeWidth={2}
        />
      </svg>

      {geometry.slots.map((slot, index) => {
        const photo = photos[index] ?? null;

        return (
          <div
            key={`slot-${index}`}
            className="absolute overflow-hidden bg-[linear-gradient(150deg,#FFF8FA_0%,#F9E1EA_55%,#E88EAD_100%)]"
            style={{
              left: percent(slot.x, width),
              top: percent(slot.y, height),
              width: percent(slot.width, width),
              height: percent(slot.height, height),
              borderRadius: "1.5%",
              boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 0.75)",
            }}
          >
            {photo ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${photo.url}")` }}
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-white/70"
                style={{ fontSize: cqw(slot.width * 0.16, width) }}
              >
                ♥
              </span>
            )}
          </div>
        );
      })}

      {plate && captionText ? (
        <>
          <div
            aria-hidden="true"
            className="absolute"
            style={{
              left: percent(plate.x, width),
              top: percent(plate.y, height),
              width: percent(plate.width, width),
              height: percent(plate.height, height),
              backgroundColor: template.caption.plate,
              borderRadius: "1.5%",
              boxShadow: `inset 0 0 0 1px ${template.edge}59`,
            }}
          />

          {title ? (
            <div
              className="absolute flex items-center justify-center overflow-hidden"
              style={{
                left: percent(captionText.title.x, width),
                top: percent(captionText.title.y, height),
                width: percent(captionText.title.width, width),
                height: percent(captionText.title.height, height),
              }}
            >
              <span
                className="max-w-full truncate font-decorative leading-none"
                style={{
                  color: template.caption.color,
                  fontSize: cqw(titleSize, width),
                }}
              >
                {title}
              </span>
            </div>
          ) : null}

          {date ? (
            <div
              className="absolute flex items-center justify-center overflow-hidden"
              style={{
                left: percent(captionText.date.x, width),
                top: percent(captionText.date.y, height),
                width: percent(captionText.date.width, width),
                height: percent(captionText.date.height, height),
              }}
            >
              <span
                className="truncate font-medium tracking-[0.18em] uppercase"
                style={{
                  color: template.caption.color,
                  fontSize: cqw(captionText.date.fontSize, width),
                  opacity: 0.78,
                }}
              >
                {date}
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      {geometry.decorations.map((decoration, index) => (
        <span
          key={`${decoration.sticker}-${index}`}
          aria-hidden="true"
          className="pointer-events-none absolute leading-none select-none"
          style={{
            left: percent(decoration.x, width),
            top: percent(decoration.y, height),
            fontSize: cqw(decoration.size, width),
            transform: `rotate(${decoration.rotate}deg)`,
          }}
        >
          {decoration.glyph}
        </span>
      ))}

      {geometry.stickers.map((sticker) => {
        const selected = sticker.id === selectedStickerId;
        const style = {
          left: percent(sticker.left, width),
          top: percent(sticker.top, height),
          width: cqw(sticker.side, width),
          height: cqw(sticker.side, width),
          fontSize: cqw(sticker.side, width),
          transform: `rotate(${sticker.rotate}deg)`,
          touchAction: interactive ? "none" : "auto",
          borderRadius: "18%",
          outline: selected ? "2px solid var(--primary)" : "none",
          outlineOffset: "2px",
        } as const;

        if (!interactive) {
          return (
            <span
              key={sticker.id}
              aria-hidden="true"
              className="pointer-events-none absolute flex items-center justify-center leading-none select-none"
              style={style}
            >
              {sticker.glyph}
            </span>
          );
        }

        return (
          <button
            key={sticker.id}
            type="button"
            aria-label={`Move the ${getSticker(sticker.sticker).label} sticker`}
            aria-pressed={selected}
            className={`absolute flex cursor-grab items-center justify-center leading-none select-none active:cursor-grabbing ${
              selected ? "z-30" : "z-20"
            }`}
            style={style}
            onPointerDown={(event) =>
              startDrag(event, sticker.id, sticker.x, sticker.y)
            }
            onPointerMove={dragSticker}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => nudge(event, sticker.id, sticker.x, sticker.y)}
            onFocus={() => onSelectSticker?.(sticker.id)}
          >
            {sticker.glyph}
          </button>
        );
      })}
    </div>
  );
}
