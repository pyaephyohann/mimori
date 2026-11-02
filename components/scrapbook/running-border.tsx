"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * One revolution, deliberately slow so the stream reads as a calm drift rather
 * than a spinner. Rotation is cyclic, so the animation loops without a visible
 * reset: 360deg is the same pose as 0deg.
 */
const DURATION_SECONDS = 9;

/**
 * One rotating conic-gradient layer. The gradient itself lives in
 * `.scrapbook-run-spin` so the four rose stops stay with the other design
 * tokens, and its first and last stops match, which hides the loop seam.
 */
function SpinLayer() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      className="scrapbook-run-spin"
      initial={{ rotate: 0 }}
      animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
      transition={{
        duration: DURATION_SECONDS,
        repeat: prefersReducedMotion ? 0 : Infinity,
        ease: "linear",
      }}
    />
  );
}

/**
 * A soft, glowing stream of pink light running around a rounded container.
 *
 * Both rings are masked to their own padding band, so only a thin outline of
 * the rotating gradient is painted and the border follows the container's own
 * rounded corners rather than drawing a separate rectangle around it. They are
 * absolutely positioned inside the caller's `relative` frame, which also owns
 * the radius (`--carousel-radius`) and the outer glow. Rotation is a transform
 * on two composited layers, so it never re-renders React and framer-motion
 * releases it on unmount. Under `prefers-reduced-motion` the rings stay as a
 * static border.
 */
export function RunningBorder() {
  return (
    <>
      <span
        aria-hidden="true"
        className="scrapbook-run-ring scrapbook-run-ring--halo"
      >
        <SpinLayer />
      </span>

      <span aria-hidden="true" className="scrapbook-run-ring">
        <SpinLayer />
      </span>
    </>
  );
}
