"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * A hand-drawn heart that draws itself around a heading.
 *
 * The caller wraps the heading in a `relative isolate` box and renders this
 * first, so the outline sits behind the letters: anywhere the stroke crosses
 * the text it disappears behind the glyphs instead of over them. The stroke
 * itself is a single loose path that finishes just past where it started,
 * which is what makes it read as drawn rather than generated.
 *
 * The animation is one CSS keyframe on `stroke-dashoffset` (see
 * `.heart-draw` in `app/globals.css`), so it costs nothing per frame and
 * `prefers-reduced-motion` simply shows the finished heart.
 *
 * The dash is the path's own length in user units, passed down as
 * `--heart-length`, rather than a `pathLength`-normalised `1`: CSS dash arrays
 * are not reliably scaled by `pathLength` (Safari draws a one-unit sliver and
 * the heart then looks like it never finished), while a plain user-unit length
 * is what the geometry actually is. `HEART_FRAME_LENGTH` is that path's
 * `getTotalLength()` — re-measure it whenever the path changes.
 *
 * The drawing is held at its first frame until the heart is on screen, because
 * a heading far down a page (Our Love Story) would otherwise finish animating
 * before the reader scrolls to it. The position is checked again once the page
 * has settled, since sections that load after the first paint (the widget area)
 * can push a heading out of the viewport. Without JavaScript the CSS simply
 * runs on arrival.
 *
 * The size comes from the caller's inset classes on the outer span, which is
 * what the browser measures; the SVG then fills exactly that box, and
 * `vector-effect: non-scaling-stroke` keeps the line an even weight at every
 * heading width even though the viewBox is stretched to fit.
 */
const HEART_FRAME_PATH =
  "M124 112C74 100 12 84 8 56C4 26 38 8 68 14C92 19 108 22 120 30C132 21 152 12 176 13C208 14 236 30 232 58C226 86 168 104 126 112";

/**
 * `HEART_FRAME_PATH`'s length in user units, from `getTotalLength()` (538.70),
 * rounded up so the closing unit of the stroke always paints.
 */
const HEART_FRAME_LENGTH = 539;

/** How much of the heart has to be visible before it starts drawing. */
const START_RATIO = 0.4;

export function HeartOutline({ className = "" }: { className?: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const path = box?.querySelector("svg path");
    if (!box || !path) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const animation = path.getAnimations()[0];
    if (!animation) return;

    const onScreen = () => {
      const rect = box.getBoundingClientRect();

      return (
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      );
    };

    let observer: IntersectionObserver | null = null;

    /** Holds the drawing at its first frame until the heart is looked at. */
    const hold = () => {
      if (observer) return;

      animation.pause();
      animation.currentTime = 0;

      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;

          observer?.disconnect();
          observer = null;
          animation.currentTime = 0;
          animation.play();
        },
        { threshold: START_RATIO },
      );

      observer.observe(box);
    };

    if (!onScreen()) hold();

    // Sections that arrive after the first paint can move the heading off the
    // screen; re-check once they have, so the drawing is not spent unseen.
    const settle = window.setTimeout(() => {
      if (!onScreen()) hold();
    }, 600);

    return () => {
      window.clearTimeout(settle);
      observer?.disconnect();
    };
  }, []);

  return (
    <span
      ref={boxRef}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
    >
      <svg
        viewBox="0 0 240 120"
        preserveAspectRatio="none"
        focusable="false"
        className="heart-draw h-full w-full overflow-visible"
      >
        <path
          d={HEART_FRAME_PATH}
          style={{ "--heart-length": HEART_FRAME_LENGTH } as CSSProperties}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
