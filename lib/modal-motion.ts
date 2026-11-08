"use client";

import type { MotionProps } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

/**
 * The one entrance and exit for every Mimori dialog.
 *
 * A bottom sheet rises from the bottom edge on a phone like a native sheet and
 * nudges up by a few pixels on desktop, where it is already centred; a
 * lightbox-style card uses the smaller centred travel at both sizes. Both fade
 * with the same soft deceleration, and both leave with a shorter fade and a
 * gentle drop, so closing reads as the reverse of opening rather than a cut.
 *
 * The values live here once so `ModalShell`, the photo viewer, the widget
 * dialog and the photobooth setup sheet cannot drift apart. Callers spread the
 * returned props onto their overlay and panel `motion.div`s and wrap the pair in
 * `AnimatePresence`, which is what keeps a dialog on screen for its exit.
 */

/**
 * A long, soft deceleration: most of the travel happens in the first third
 * and the rest settles gently, so the sheet arrives rather than snapping into
 * place. The overlay fade and the panel's movement share it, which is what
 * keeps the two in step.
 */
export const MODAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Closing accelerates away instead of decelerating into nothing, so a fade
 * that starts at full strength is not already three-quarters gone by the time
 * the eye registers it.
 */
export const MODAL_EXIT_EASE: [number, number, number, number] = [0.4, 0, 1, 1];

/** 400ms: slow enough to read as a deliberate arrival, still under half a second. */
const OPEN_SECONDS = 0.4;

/** Shorter than the entrance, so a dismissal stays responsive while it stays soft. */
const CLOSE_SECONDS = 0.3;

/** Tailwind's `sm`; the width at which every sheet centres and rounds. */
const WIDE_QUERY = "(min-width: 640px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
}

function readWide() {
  return window.matchMedia(WIDE_QUERY).matches;
}

export function useIsWideViewport() {
  return useSyncExternalStore(subscribeWide, readWide, () => false);
}

/**
 * The page's scroll lock, shared by every open dialog.
 *
 * Dialogs save and restore `body.overflow` themselves, which breaks as soon as
 * two of them overlap: a dialog that is still playing its exit holds the lock
 * while a second one opens behind it, and the second one then "restores" the
 * locked value on its way out. Counting the holders instead means the page is
 * unlocked exactly once, by whichever dialog closes last.
 */
let scrollLocks = 0;
let unlockValue = "";
let unlockPadding = "";

export function lockBodyScroll() {
  if (scrollLocks === 0) {
    const body = document.body;

    unlockValue = body.style.overflow;
    unlockPadding = body.style.paddingRight;

    // Hiding the overflow also removes the scrollbar, which would widen the
    // page by its width and visibly shift the content behind the dialog. The
    // same space is added back as padding, so the page under a modal does not
    // move when it opens or when it closes; overlay scrollbars measure 0 and
    // need nothing.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbar > 0) {
      const current =
        Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbar}px`;
    }

    body.style.overflow = "hidden";
  }

  scrollLocks += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);

    if (scrollLocks === 0) {
      document.body.style.overflow = unlockValue;
      document.body.style.paddingRight = unlockPadding;
      unlockValue = "";
      unlockPadding = "";
    }
  };
}

export type ModalMotionKind = "sheet" | "center";

export type ModalMotion = {
  overlay: MotionProps;
  panel: MotionProps;
};

/**
 * `sheet` for the dialogs that sit on the bottom edge below `sm`; `center` for
 * a card that is centred at every width.
 */
export function useModalMotion(kind: ModalMotionKind = "sheet"): ModalMotion {
  const prefersReducedMotion = useReducedMotion();
  const wide = useIsWideViewport();

  const overlay: MotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0 } },
        exit: { opacity: 0, transition: { duration: 0 } },
      }
    : {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: { duration: OPEN_SECONDS, ease: MODAL_EASE },
        },
        exit: {
          opacity: 0,
          transition: { duration: CLOSE_SECONDS, ease: MODAL_EXIT_EASE },
        },
      };

  if (prefersReducedMotion) {
    // Reduced motion: no travel at all, and no fade to sit through.
    const still: MotionProps = {
      initial: { opacity: 0, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
      exit: { opacity: 0, y: 0, scale: 1, transition: { duration: 0 } },
    };

    return { overlay, panel: still };
  }

  const enter = { duration: OPEN_SECONDS, ease: MODAL_EASE };
  const leave = { duration: CLOSE_SECONDS, ease: MODAL_EXIT_EASE };

  if (kind === "sheet") {
    return {
      overlay,
      panel: {
        // A phone gets the whole sheet: it starts below the viewport edge and
        // arrives. Desktop lifts the centred card by a couple of dozen pixels.
        initial: { opacity: 0, y: wide ? 28 : "100%" },
        animate: { opacity: 1, y: 0, transition: enter },
        // Closing drops a little instead of travelling back off screen, so the
        // dismissal reads as gentle rather than as a bounce.
        exit: { opacity: 0, y: wide ? 18 : 40, transition: leave },
      },
    };
  }

  return {
    overlay,
    panel: {
      initial: { opacity: 0, y: wide ? 20 : 34, scale: 0.99 },
      animate: { opacity: 1, y: 0, scale: 1, transition: enter },
      exit: { opacity: 0, y: wide ? 14 : 24, scale: 0.99, transition: leave },
    },
  };
}
