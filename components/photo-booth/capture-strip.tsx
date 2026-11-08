"use client";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import type { BoothLayout } from "@/lib/photo-booth/catalog";
import type { Capture } from "@/lib/photo-booth/capture";

type CaptureStripProps = {
  /** One entry per slot in the selected count; null until that slot is shot. */
  shots: readonly (Capture | null)[];
  /** The slot the camera is about to fill, if any. */
  activeTarget: number | null;
  layout: BoothLayout;
};

/**
 * The session's slots.
 *
 * A strip lines its frames up like a print, a collage tiles them in a square
 * grid, and an empty slot is a scrapbook tile rather than a grey box. The slot
 * being photographed is ringed, so progress is readable without counting.
 */
export function CaptureStrip({
  shots,
  activeTarget,
  layout,
}: CaptureStripProps) {
  const isStrip = layout === "strip";

  return (
    <div>
      <p className="mb-2 text-[10px] tracking-[0.2em] text-paper-foreground/50 uppercase">
        Your photos
      </p>

      <ol
        className={
          isStrip
            ? "flex gap-2 overflow-x-auto pb-1"
            : "grid grid-cols-3 gap-2 sm:grid-cols-6"
        }
      >
        {shots.map((shot, index) => {
          const active = index === activeTarget;

          return (
            <li
              key={index}
              className={isStrip ? "w-16 shrink-0 sm:w-20" : ""}
            >
              <div
                aria-current={active ? "step" : undefined}
                className={`relative overflow-hidden rounded-lg bg-blush-pink/40 ring-1 transition-shadow ${
                  active
                    ? "ring-2 ring-primary shadow-[0_10px_22px_-16px_rgba(73,52,61,0.9)]"
                    : "ring-paper-edge"
                } ${isStrip ? "aspect-[3/4]" : "aspect-square"}`}
              >
                {shot ? (
                  <>
                    <span
                      role="img"
                      aria-label={`Photo ${index + 1}, captured`}
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${shot.url}")` }}
                    />
                    <span className="absolute bottom-0.5 left-0.5 rounded-full bg-paper/90 px-1.5 text-[9px] font-semibold text-paper-foreground">
                      {index + 1}
                    </span>
                  </>
                ) : (
                  <span
                    aria-label={`Photo ${index + 1}, waiting`}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-paper-foreground/45"
                  >
                    <HeartDoodle className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold">{index + 1}</span>
                    {active ? (
                      <BowSticker className="absolute -top-1 -right-1 text-xs" />
                    ) : null}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
