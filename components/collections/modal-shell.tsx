"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { BowSticker } from "@/components/scrapbook/doodles";

type ModalShellProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider layout for photo pickers. */
  wide?: boolean;
  /**
   * Stacks this dialog above another open overlay (the gallery viewer opens
   * the carousel picker). Defaults to the shared layer.
   */
  elevated?: boolean;
};

/**
 * Shared scrapbook dialog chrome: paper surface, bow, close button, scroll
 * lock and Escape-to-close. Kept in one place so the collection dialogs all
 * behave the same way.
 */
export function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
  elevated = false,
}: ModalShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
      onClick={onClose}
      className={`fixed inset-0 flex items-end justify-center bg-warm-charcoal/45 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        elevated ? "z-[80]" : "z-[65]"
      }`}
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
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-paper-edge bg-paper shadow-[0_28px_70px_-30px_rgba(73,52,61,0.9)] sm:max-h-[88vh] sm:rounded-[28px] ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-paper-edge px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-paper-foreground/55 uppercase">
              Mimori scrapbook
            </p>
            <h2
              id={titleId}
              className="flex items-center gap-2 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
            >
              {title}
              <BowSticker className="text-base" />
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-paper-foreground/65">
                {description}
              </p>
            ) : null}
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-paper-edge text-paper-foreground transition-colors hover:bg-blush-pink/70"
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
          {children}
        </div>

        {footer ? (
          <div className="border-t border-paper-edge px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
