"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId } from "react";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import type { BorderKey } from "@/lib/photo-booth/borders";
import type { BoothLayout, PhotoCount } from "@/lib/photo-booth/catalog";

import { SetupStep } from "./setup-step";

type SetupDialogProps = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  borderKey: BorderKey;
  onPhotoCountChange: (count: PhotoCount) => void;
  onLayoutChange: (layout: BoothLayout) => void;
  onBorderChange: (borderKey: BorderKey) => void;
  /** Leaves setup and opens the camera with the current choices. */
  onStart: () => void;
  onClose: () => void;
};

/**
 * The setup sheet for a fresh booth.
 *
 * This is the same shell as the Add Widgets dialog — a blurred backdrop, a
 * bottom sheet on phones, a centred card on wider screens — so creating a booth
 * reads like every other creation flow in Mimori. The choices themselves are
 * still `SetupStep`: no card, preview or behaviour is redefined here. Closing
 * it only dismisses the sheet; the camera starts when the visit starts.
 */
export function SetupDialog({
  photoCount,
  layout,
  borderKey,
  onPhotoCountChange,
  onLayoutChange,
  onBorderChange,
  onStart,
  onClose,
}: SetupDialogProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-warm-charcoal/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.22,
          ease: "easeOut",
        }}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-paper-edge bg-paper shadow-[0_28px_70px_-30px_rgba(73,52,61,0.9)] sm:max-h-[88vh] sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-paper-edge px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-paper-foreground/55 uppercase">
              Mimori photobooth
            </p>
            <h2
              id={titleId}
              className="flex items-center gap-2 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
            >
              Our little photobooth
              <BowSticker className="text-base" />
            </h2>
            <p className="mt-1 text-xs text-paper-foreground/65">
              Let’s make some memories together.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-paper-edge text-paper-foreground transition-colors hover:bg-blush-pink/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <SetupStep
            photoCount={photoCount}
            layout={layout}
            borderKey={borderKey}
            onPhotoCountChange={onPhotoCountChange}
            onLayoutChange={onLayoutChange}
            onBorderChange={onBorderChange}
            onStart={onStart}
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-paper-edge px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5 text-[11px] text-paper-foreground/55">
            <HeartDoodle className="h-3.5 w-3.5" />
            The camera starts only when you tap start
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-paper-edge px-3.5 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
