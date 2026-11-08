"use client";

import { useId } from "react";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import {
  getBorderTemplate,
  type BorderKey,
} from "@/lib/photo-booth/borders";
import type { BoothLayout, PhotoCount } from "@/lib/photo-booth/catalog";
import { composeBooth } from "@/lib/photo-booth/compose";
import type { Capture } from "@/lib/photo-booth/capture";

type ReviewStepProps = {
  /** Every slot, in capture order. The session only reaches this step full. */
  shots: readonly Capture[];
  photoCount: PhotoCount;
  layout: BoothLayout;
  borderKey: BorderKey;
  onRetake: (index: number) => void;
  onRetakeAll: () => void;
  onBackToSetup: () => void;
  /** Opens the editor with the current captures. */
  onEdit: () => void;
};

function percent(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

/**
 * The captured photos arranged inside the real composition geometry.
 *
 * A stand-in for the editor, not the editor: the border, slots and decorations
 * come from the same `composeBooth` the setup preview uses, so the print the
 * photos will make is already recognisable.
 */
function SessionPreview({
  shots,
  photoCount,
  layout,
  borderKey,
}: {
  shots: readonly Capture[];
  photoCount: PhotoCount;
  layout: BoothLayout;
  borderKey: BorderKey;
}) {
  const template = getBorderTemplate(borderKey);
  const geometry = composeBooth({
    photoCount,
    layout,
    borderKey,
    caption: false,
  });

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        containerType: "inline-size",
        aspectRatio: `${geometry.width} / ${geometry.height}`,
        backgroundColor: template.frame,
        border: `1px solid ${template.edge}`,
        borderRadius: "3.5%",
        boxShadow: "0 18px 40px -28px rgba(73, 52, 61, 0.9)",
      }}
    >
      {geometry.slots.map((slot, index) => {
        const shot = shots[index];

        return (
          <div
            key={`slot-${index}`}
            className="absolute overflow-hidden bg-white/70"
            style={{
              left: percent(slot.x, geometry.width),
              top: percent(slot.y, geometry.height),
              width: percent(slot.width, geometry.width),
              height: percent(slot.height, geometry.height),
              borderRadius: "1.5%",
              boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.7)",
            }}
          >
            {shot ? (
              <span
                role="img"
                aria-label={`Photo ${index + 1} in the print`}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${shot.url}")` }}
              />
            ) : null}
          </div>
        );
      })}

      {geometry.decorations.map((decoration, index) => (
        <span
          key={`${decoration.sticker}-${index}`}
          aria-hidden="true"
          className="absolute leading-none select-none"
          style={{
            left: percent(decoration.x, geometry.width),
            top: percent(decoration.y, geometry.height),
            fontSize: `${(decoration.size / geometry.width) * 100}cqw`,
            transform: `rotate(${decoration.rotate}deg)`,
          }}
        >
          {decoration.glyph}
        </span>
      ))}
    </div>
  );
}

/**
 * The review step: every shot in order, a print preview, and the retakes.
 *
 * Retaking one photo only asks the camera for that slot; the rest stay exactly
 * as they were. Retake all starts the session over. Nothing is uploaded or
 * persisted — the photos live in memory until the editor phase adds saving.
 */
export function ReviewStep({
  shots,
  photoCount,
  layout,
  borderKey,
  onRetake,
  onRetakeAll,
  onBackToSetup,
  onEdit,
}: ReviewStepProps) {
  const headingId = useId();
  const template = getBorderTemplate(borderKey);

  return (
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <section
        aria-labelledby={headingId}
        className="rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
              Step three · Review
            </p>
            <h2
              id={headingId}
              className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
            >
              Your photos are ready
              <HeartDoodle filled className="h-4 w-4 text-candy-pink" />
            </h2>
            <p className="mt-1 max-w-md text-xs text-paper-foreground/65">
              Retake any shot you like, then take your little print into the
              next step.
            </p>
          </div>

          <span className="rounded-full bg-success-surface px-3 py-1 text-[11px] font-medium text-success ring-1 ring-success-border">
            Ready for editing
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="rounded-2xl bg-blush-pink/35 p-4 ring-1 ring-paper-edge">
            <div className="mx-auto w-full max-w-[16rem]">
              <SessionPreview
                shots={shots}
                photoCount={photoCount}
                layout={layout}
                borderKey={borderKey}
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-paper-foreground/60">
              {photoCount} photos ·{" "}
              {layout === "strip" ? "Vertical strip" : "Square collage"} ·{" "}
              {template.title}
            </p>
          </div>

          <div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shots.map((shot, index) => (
                <li
                  key={shot.id}
                  className="rounded-xl border border-paper-edge bg-white/70 p-1.5"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-blush-pink/40">
                    <span
                      role="img"
                      aria-label={`Photo ${index + 1}`}
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${shot.url}")` }}
                    />
                    <span className="absolute top-1 left-1 rounded-full bg-paper/90 px-1.5 text-[9px] font-semibold text-paper-foreground">
                      {index + 1}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-semibold tracking-wide text-paper-foreground/60 uppercase">
                      Photo {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRetake(index)}
                      className="cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-medium text-deep-candy-pink transition-colors hover:bg-blush-pink/70"
                    >
                      Retake
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRetakeAll}
                className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
              >
                Retake all
              </button>
              <button
                type="button"
                onClick={onBackToSetup}
                className="cursor-pointer rounded-full px-3 py-2 text-xs text-paper-foreground/60 underline-offset-2 transition-colors hover:text-paper-foreground hover:underline"
              >
                Back to setup
              </button>

              <button
                type="button"
                onClick={onEdit}
                className="ml-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Decorate your print
                <BowSticker className="text-base" />
              </button>
            </div>

            <p className="mt-4 flex items-center gap-1.5 font-decorative text-base text-dusty-rose">
              <BowSticker className="text-sm" />
              These photos stay on this device until you save them.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
