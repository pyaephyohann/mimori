"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type OptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  blurb?: string;
  badge?: string;
  /** The miniature that communicates what this choice looks like. */
  preview: ReactNode;
  /** Height of the preview well, so cards of different shapes line up. */
  previewClassName?: string;
};

/**
 * A scrapbook selection card.
 *
 * Mirrors the widget style cards: a paper card holding a real miniature, its
 * title and a short blurb, with the selected one outlined in the brand pink.
 * The whole card is the control, so the target is comfortable on touch, and it
 * is a plain button so Enter and Space work without extra key handling.
 */
export function OptionCard({
  selected,
  onSelect,
  title,
  blurb,
  badge,
  preview,
  previewClassName = "h-24",
}: OptionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
      className={`group flex h-full cursor-pointer flex-col rounded-2xl border p-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected
          ? "border-primary bg-blush-pink/60 shadow-[0_16px_34px_-26px_rgba(73,52,61,0.9)]"
          : "border-paper-edge bg-white/70 hover:border-primary/60 hover:bg-blush-pink/35"
      }`}
    >
      <span
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-surface-muted/50 ring-1 ring-paper-edge/80 ${previewClassName}`}
      >
        {preview}

        {selected ? (
          <motion.span
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 24 }
            }
            className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
              <path
                d="m5 13 4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        ) : null}
      </span>

      <span className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <span className="text-sm font-semibold text-paper-foreground">
          {title}
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] tracking-wide text-paper-foreground/70 uppercase">
            {badge}
          </span>
        ) : null}
      </span>

      {blurb ? (
        <span className="mt-1 block px-0.5 text-xs leading-snug text-paper-foreground/70">
          {blurb}
        </span>
      ) : null}
    </motion.button>
  );
}
