"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { Photo } from "@/lib/photo";
import PageCurlCanvas, {
  preloadPageImages,
  type CurlHandle,
} from "@/components/collections/page-curl-canvas";

/**
 * A collection as a real photo album: two facing paper pages, and a sheet that
 * turns over the spine when you move through the photos.
 *
 * The turning sheet is one continuous curled surface drawn on a canvas, not a
 * flat card and not a chain of DOM strips. The spine edge turns with the
 * overall progress while the free edge trails behind it, so the sheet bends
 * hardest mid-turn and lies flat at both ends — a page lifting and
 * straightening again as it lands. The canvas carries both of the sheet's
 * faces, so the photo on its front and the print on its back are both seen
 * while the pages underneath are uncovered. One bitmap means no joints,
 * no z-fighting, and no seam lines.
 *
 * The light is not painted on: each ribbon's shade comes from how far its own
 * angle has turned away from the room, with a sheen where the sheet grazes
 * the light and a shadow on the paper below cast by the sheet's own
 * silhouette. Highlight and shadow therefore travel with the bend instead of
 * sitting in a fixed gradient.
 *
 * Photos are laid out inside a fixed paper page with `object-contain`, so no
 * image is ever stretched or cropped to fit the book.
 */

/** One complete turn, with the sheet accelerating from rest and settling onto
 *  the far page rather than starting at full speed. */
const FLIP_MS = 900;
const DRAG_COMMIT_PROGRESS = 0.22;
/** A fast flick completes the turn even when the drag itself is short. */
const FLICK_VELOCITY = 0.9; // progress units per second
const VELOCITY_WINDOW_MS = 120;

/** A very faint paper tooth, tiled from one small SVG so it costs one texture
 *  per size and is never fetched. */
const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";
const MAX_BOOK_WIDTH = 920;
const PAGE_ASPECT = 1.3;
const PAGE_ASPECT_NARROW = 1.45;
const VIEWPORT_HEIGHT_SHARE = 0.68;

type Flip = {
  /** Page index the book is leaving. */
  from: number;
  /** Page index the book is arriving at. */
  to: number;
  direction: 1 | -1;
};

type Layout = {
  bookWidth: number;
  pageWidth: number;
  pageHeight: number;
};

type Drag = {
  startX: number;
  direction: 1 | -1;
  progress: number;
  grabY: number;
  lastX: number;
  lastT: number;
  velocity: number;
};

const FALLBACK_LAYOUT: Layout = {
  bookWidth: 720,
  pageWidth: 360,
  pageHeight: 468,
};

type PhotoBookProps = {
  /** The collection's photos, in the collection's own order. */
  photos: Photo[];
  collectionName: string;
  /** Opens the existing viewer on a page's photo, for a closer look. */
  onOpenPhoto: (index: number) => void;
  /** Leaves the book for the collections list. */
  onClose: () => void;
};

export function PhotoBook({
  photos,
  collectionName,
  onOpenPhoto,
  onClose,
}: PhotoBookProps) {
  const reduceMotion = useReducedMotion();
  const total = photos.length;
  const pagesPerSpread = 2;

  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [layout, setLayout] = useState<Layout>(FALLBACK_LAYOUT);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const curlRef = useRef<CurlHandle>(null);
  const grabYRef = useRef(0.5);

  const frameRef = useRef<number | null>(null);
  const flipRef = useRef<Flip | null>(null);
  const dragRef = useRef<Drag | null>(null);
  /** Set when a pointer travels far enough to be a turn, so the click that
   *  ends it does not also open the photo. */
  const draggedRef = useRef(false);

  /**
   * The book is measured rather than guessed: the curl needs real pixel
   * widths, and the pages are sized so the whole album fits the viewport
   * without the photos becoming stamps.
   */
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    const measure = () => {
      const available = wrapper.clientWidth;

      if (available <= 0) {
        return;
      }

      const narrow = available < 640;
      const aspect = narrow ? PAGE_ASPECT_NARROW : PAGE_ASPECT;
      const maxHeight = window.innerHeight * VIEWPORT_HEIGHT_SHARE;
      const bookWidth = Math.min(
        available,
        MAX_BOOK_WIDTH,
        Math.max(280, (maxHeight / aspect) * 2),
      );
      const pageWidth = bookWidth / 2;

      setLayout({
        bookWidth,
        pageWidth,
        pageHeight: Math.min(Math.round(pageWidth * aspect), maxHeight),
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /**
   * The sheet is cut in bend-space: strip `i` covers the part of the page whose
   * bend share runs from `i / SEGMENT_COUNT` to `(i + 1) / SEGMENT_COUNT`, so
   * every strip carries an equal slice of the bend and the strips narrow toward
   * the free edge, where the page is most curved.
   */
  /**
   * Draws the sheet at one point of the turn: `progress` runs 0 (flat on the
   * right) to 1 (flat on the left) and the canvas bends the free edge behind
   * the spine edge mid-turn. A single bitmap means no strip joints to seam.
   */
  const applyProgress = useCallback((progress: number) => {
    curlRef.current?.draw(progress, grabYRef.current);
  }, []);

  const animateTo = useCallback(
    (
      from: number,
      to: number,
      release: boolean,
      onDone: () => void,
      initialVelocity = 0,
    ) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      const start = performance.now();
      const distance = Math.abs(to - from);
      const duration = release
        ? Math.max(180, Math.min(600, 320 * distance + 120))
        : Math.max(260, (FLIP_MS * distance));
      // A turn started from a button begins and ends at rest; one released
      // from a drag keeps its flick velocity and then settles, so a fast
      // short throw still completes instead of snapping back.
      const ease = release
        ? (t: number) => 1 - Math.pow(1 - t, 3)
        : (t: number) => t * t * (3 - 2 * t);
      const boost = release
        ? Math.max(-0.25, Math.min(0.25, initialVelocity * 0.12))
        : 0;

      const step = (now: number) => {
        const elapsed = Math.min(1, (now - start) / duration);
        const eased = ease(elapsed);
        // Blend the flick's momentum into the first part of the settle so
        // the sheet leaves the finger at speed instead of from a dead stop.
        const fling = boost * (1 - elapsed) * (to >= from ? 1 : -1);
        const value = from + (to - from) * eased + fling * distance;

        applyProgress(value);

        if (elapsed < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          frameRef.current = null;
          applyProgress(to);
          onDone();
        }
      };

      frameRef.current = requestAnimationFrame(step);
    },
    [applyProgress],
  );

  const canGo = useCallback(
    (direction: 1 | -1) => {
      if (direction === 1) {
        return spread + pagesPerSpread < total;
      }

      return spread - pagesPerSpread >= 0;
    },
    [spread, total],
  );

  /** One full turn. Repeated calls while a turn is running are dropped, so a
   *  held arrow key or a thrown button cannot stack sheets. */
  const turn = useCallback(
    (direction: 1 | -1) => {
      if (flipRef.current) {
        return;
      }

      const from = spread;
      const to = from + direction * pagesPerSpread;

      if (to < 0 || to >= total) {
        return;
      }

      const next: Flip = { from, to, direction };
      flipRef.current = next;

      if (reduceMotion) {
        flipRef.current = null;
        setSpread(to);
        return;
      }

      setFlip(next);

      const fromProgress = direction === 1 ? 0 : 1;
      const toProgress = direction === 1 ? 1 : 0;

      // The opening frame is drawn by the layout effect below, after the sheet
      // has been painted with these pages. Drawing it here would still use the
      // previous spread's textures, which is a visible wrong page for a frame.
      animateTo(fromProgress, toProgress, false, () => {
        flipRef.current = null;
        setSpread(to);
        setFlip(null);
      });
    },
    [animateTo, pagesPerSpread, reduceMotion, spread, total],
  );

  // The sheet is laid out before the first painted frame of a turn, not after.
  // The canvas mounts with the flip state, so this also covers the drag's
  // first frame, where the ref is not yet attached inside the pointer handler.
  useLayoutEffect(() => {
    if (flip) {
      const drag = dragRef.current;
      applyProgress(drag ? drag.progress : flip.direction === 1 ? 0 : 1);
      return;
    }

    // Between turns the sheet is invisible but its textures stay painted, so
    // the next forward turn has nothing to build.
    curlRef.current?.clear();
  }, [applyProgress, flip]);

  // The pages of the two possible turns — forward from this spread and back
  // into it — are decoded before either is needed, so a sheet is never painted
  // with missing photos (a bright paper flash mid-turn).
  useEffect(() => {
    preloadPageImages([
      photos[spread - 1]?.src,
      photos[spread]?.src,
      photos[spread + 1]?.src,
      photos[spread + 2]?.src,
    ]);
  }, [photos, spread]);

  // A resize rebuilds every strip's geometry, so a turn in flight is abandoned
  // rather than left frozen halfway through the old measurements.
  useEffect(() => {
    if (!flipRef.current && !dragRef.current) {
      return;
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    flipRef.current = null;
    dragRef.current = null;
    setFlip(null);
  }, [layout.pageWidth]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Anything the user could be typing into, or a dialog above the book,
      // keeps its own arrow keys (the photo viewer uses them too).
      const target =
        event.target instanceof HTMLElement ? event.target : null;

      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog']",
        )
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        if (canGo(1)) {
          event.preventDefault();
          turn(1);
        }
      }

      if (event.key === "ArrowLeft") {
        if (canGo(-1)) {
          event.preventDefault();
          turn(-1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGo, turn]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (flipRef.current || (event.target as HTMLElement).closest("a")) {
      return;
    }

    draggedRef.current = false;

    const rect = event.currentTarget.getBoundingClientRect();
    const direction: 1 | -1 =
      event.clientX > rect.left + rect.width / 2 ? 1 : -1;

    if (!canGo(direction) || reduceMotion) {
      return;
    }

    const from = spread;
    const next: Flip = {
      from,
      to: from + direction * pagesPerSpread,
      direction,
    };

    flipRef.current = next;
    const rectY = event.currentTarget.getBoundingClientRect();
    const grabY =
      rectY.height > 0
        ? Math.min(1, Math.max(0, (event.clientY - rectY.top) / rectY.height))
        : 0.5;
    grabYRef.current = grabY;
    dragRef.current = {
      startX: event.clientX,
      direction,
      progress: direction === 1 ? 0 : 1,
      grabY,
      lastX: event.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    setFlip(next);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers (and some touch stacks) cannot be captured; the
      // drag still works without capture.
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    if (Math.abs(drag.startX - event.clientX) > 6) {
      draggedRef.current = true;
    }

    const delta = (drag.startX - event.clientX) / layout.pageWidth;
    const progress =
      drag.direction === 1
        ? Math.min(1, Math.max(0, delta))
        : Math.min(1, Math.max(0, 1 + delta));

    // Flick velocity over the recent window, in progress units per second.
    // Signed so a throw toward completion stays positive.
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    const dx = (drag.lastX - event.clientX) / layout.pageWidth;
    const instant = drag.direction === 1 ? dx / (dt / 1000) : -dx / (dt / 1000);
    const alpha = Math.min(1, dt / VELOCITY_WINDOW_MS);
    drag.velocity = drag.velocity * (1 - alpha) + instant * alpha;
    drag.lastX = event.clientX;
    drag.lastT = now;

    drag.progress = progress;
    applyProgress(progress);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const current = flipRef.current;

    if (!current) {
      return;
    }

    // Distance decides by default; a fast flick toward completion overrides
    // a short drag, and a throw back toward the start cancels a far one.
    const flick = drag.velocity > FLICK_VELOCITY ? 1 : drag.velocity < -FLICK_VELOCITY ? -1 : 0;
    const pastThreshold =
      drag.direction === 1
        ? drag.progress > DRAG_COMMIT_PROGRESS
        : drag.progress < 1 - DRAG_COMMIT_PROGRESS;
    const commit = flick === 1 ? true : flick === -1 ? false : pastThreshold;

    animateTo(
      drag.progress,
      commit ? (drag.direction === 1 ? 1 : 0) : drag.direction === 1 ? 0 : 1,
      true,
      () => {
        flipRef.current = null;

        if (commit) {
          setSpread(current.to);
        }

        setFlip(null);
      },
      drag.velocity,
    );
  };

  const leftIndex = flip
    ? flip.direction === 1
      ? spread
      : flip.to
    : spread;
  const rightIndex = flip
    ? flip.direction === 1
      ? flip.to + 1
      : spread + 1
    : spread + 1;

  const leafFrontIndex = flip
    ? flip.direction === 1
      ? spread + 1
      : flip.to + 1
    : spread + 1;
  const leafBackIndex = flip
    ? flip.direction === 1
      ? flip.to
      : spread
    : spread + pagesPerSpread;

  const lastVisible = Math.min(
    rightIndex < total ? rightIndex : leftIndex,
    total - 1,
  );
  // The folio follows the spread the book has settled on, so a turn changes it
  // when the page lands rather than the moment the sheet is lifted. The page
  // is the one open on the right — the last page when the spine has run out.
  const settledRight = spread + 1;
  const currentPage =
    total === 0 ? 0 : settledRight < total ? settledRight + 1 : spread + 1;
  const folio = `${currentPage} / ${total}`;

  const atStart = spread <= 0;
  const atEnd = spread + pagesPerSpread >= total;

  return (
    <section
      aria-label={`Photo book for ${collectionName}`}
      className="mt-8"
      data-photo-book=""
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.2em] text-white uppercase">
            Our photo book
          </p>
          <h2 className="truncate font-decorative text-2xl leading-tight text-white sm:text-3xl">
            {collectionName}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border border-paper-edge bg-paper px-3 py-1.5 text-xs font-medium text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink"
        >
          Close book
        </button>
      </div>

      <div ref={wrapperRef} className="mt-5 w-full">
        <div className="relative isolate mx-auto" style={{ width: layout.bookWidth }}>
          {/* The board and the stack of paper under the open pages. They sit
              outside the clipped spread below: a turned sheet is magnified by
              its own depth, and clipping is what keeps it inside the book
              instead of let it step out past the cover. */}
          <div
            aria-hidden="true"
            className="absolute -z-10 -inset-x-3 -inset-y-2 rounded-[10px] bg-[#F1DBE3] shadow-[0_30px_60px_-30px_rgba(73,52,61,0.85)]"
          />
          <div
            aria-hidden="true"
            className="absolute -z-10 inset-x-0 top-1.5 h-full rounded-[4px] bg-[#F8E9EF]"
          />
          <div
            aria-hidden="true"
            className="absolute -z-10 inset-x-0 top-0.5 h-full rounded-[4px] bg-[#FCF3F6]"
          />

          <div
            className="relative select-none overflow-hidden rounded-[4px] shadow-[0_18px_40px_-26px_rgba(73,52,61,0.9)]"
            style={{
              height: layout.pageHeight,
              // A horizontal drag is the page turn; vertical is still the
              // page's own scroll.
              touchAction: "pan-y",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="group"
            aria-roledescription="photo book"
            aria-label="Photo pages. Use the arrow keys, the buttons, or drag a page to turn it."
          >
            <div
              className="absolute inset-0 flex overflow-hidden rounded-[4px] bg-paper ring-1 ring-paper-edge"
              style={{ width: layout.pageWidth * 2 }}
            >
              <BookPage
                photo={photos[leftIndex]}
                pageWidth={layout.pageWidth}
                pageHeight={layout.pageHeight}
                side="left"
                pageNumber={leftIndex + 1}
                total={total}
                onOpen={() => {
                  if (!draggedRef.current) {
                    onOpenPhoto(leftIndex);
                  }
                }}
              />

              <div className="relative w-px shrink-0 bg-[linear-gradient(to_bottom,rgba(73,52,61,0.16),rgba(73,52,61,0.32),rgba(73,52,61,0.16))]" />

              <BookPage
                photo={photos[rightIndex]}
                pageWidth={layout.pageWidth}
                pageHeight={layout.pageHeight}
                side="right"
                pageNumber={rightIndex + 1}
                total={total}
                onOpen={() => {
                  if (!draggedRef.current) {
                    onOpenPhoto(rightIndex);
                  }
                }}
              />
            </div>

            {/* The gutter; the travelling cast shadow is painted by the curl canvas. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-16 -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(to right, rgba(73,52,61,0) 0%, rgba(73,52,61,0.10) 42%, rgba(73,52,61,0.22) 50%, rgba(73,52,61,0.10) 58%, rgba(73,52,61,0) 100%)",
              }}
            />

            {/* The turning sheet: one continuous curled surface on a canvas.
                It stays mounted while idle — cleared, not unmounted — so the
                sheet for a forward turn is already painted before it is shown,
                and a turn never opens on blank paper ([D-052](DECISIONS.md)). */}
            <PageCurlCanvas
              ref={curlRef}
              front={photos[leafFrontIndex]}
              back={photos[leafBackIndex]}
              frontSide={flip?.direction === -1 ? "left" : "right"}
              frontNumber={
                leafFrontIndex < total ? String(leafFrontIndex + 1) : ""
              }
              backNumber={
                leafBackIndex < total ? String(leafBackIndex + 1) : ""
              }
              pageWidth={layout.pageWidth}
              pageHeight={layout.pageHeight}
              direction={flip?.direction ?? 1}
            />
          </div>

          {/* The book's own folio: the page you are on, then how many the
              album holds, printed quietly at the foot of the spread. */}
          <p
            aria-live="polite"
            className="mt-3 text-center font-decorative text-xs tracking-[0.18em] text-paper-foreground/55"
          >
            {folio}
          </p>

          {/* Equal padding either side holds both arrows the same distance in
              from the book's edges, so they read as a pair at every width. */}
          <div className="mt-3 flex items-center justify-between gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => turn(-1)}
              disabled={atStart || Boolean(flip)}
              aria-label="Previous pages"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-paper-edge bg-paper text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Chevron direction="left" />
            </button>

            <button
              type="button"
              onClick={() => turn(1)}
              disabled={atEnd || Boolean(flip)}
              aria-label="Next pages"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-paper-edge bg-paper text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Chevron direction="right" />
            </button>
          </div>
        </div>
      </div>

      {/* Keeps the last spread's number reachable for the counter and screen
          readers without duplicating the pages themselves. */}
      <span className="sr-only">
        Showing photo {lastVisible + 1} of {total}.
      </span>
    </section>
  );
}

/** A print on the page: contained, never cropped or stretched, and lifted
 *  off the paper by its own shadow rather than by a heavy card. */
function BookPhoto({ photo }: { photo: Photo }) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes="(max-width: 640px) 34vw, 300px"
      className="object-contain [filter:drop-shadow(0_12px_18px_rgba(73,52,61,0.35))]"
      draggable={false}
    />
  );
}

function BookPage({
  photo,
  pageWidth,
  pageHeight,
  side,
  pageNumber,
  total,
  onOpen,
  interactive = true,
}: {
  photo: Photo | undefined;
  pageWidth: number;
  pageHeight: number;
  side: "left" | "right";
  pageNumber: number;
  total: number;
  onOpen: () => void;
  /** The turning sheet is decorative: its copies must not add focus stops. */
  interactive?: boolean;
}) {
  const gutterShadow =
    side === "left"
      ? "linear-gradient(to left, rgba(73,52,61,0.10), rgba(73,52,61,0) 18%)"
      : "linear-gradient(to right, rgba(73,52,61,0.10), rgba(73,52,61,0) 18%)";

  return (
    <div
      className="relative h-full overflow-hidden bg-paper"
      style={{
        width: pageWidth,
        height: pageHeight,
        backgroundImage:
          "radial-gradient(120% 90% at 18% 8%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 55%), radial-gradient(90% 70% at 88% 92%, rgba(249,225,234,0.55) 0%, rgba(249,225,234,0) 60%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: gutterShadow }}
      />

      {/* Warm white paper with a tooth you can only feel, not point at. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: PAPER_GRAIN }}
      />

      {photo ? (
        <>
          <div className="absolute inset-x-[8%] top-[8%] bottom-[18%]">
            {interactive ? (
              <button
                type="button"
                onClick={onOpen}
                aria-label={
                  photo.caption ? `View “${photo.caption}”` : "View this photo"
                }
                className="relative block h-full w-full cursor-zoom-in outline-offset-4"
              >
                <BookPhoto photo={photo} />
              </button>
            ) : (
              <span className="relative block h-full w-full">
                <BookPhoto photo={photo} />
              </span>
            )}
          </div>

          <p
            className="pointer-events-none absolute inset-x-[8%] bottom-[6%] truncate text-center font-decorative text-paper-foreground/75"
            style={{ fontSize: Math.max(12, pageWidth * 0.045) }}
          >
            {photo.caption.trim()}
          </p>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-paper-foreground/35">
          <span className="font-decorative" style={{ fontSize: pageWidth * 0.09 }}>
            ♡
          </span>
          <span
            className="font-decorative"
            style={{ fontSize: Math.max(12, pageWidth * 0.045) }}
          >
            The end
          </span>
        </div>
      )}

      <span
        className={`pointer-events-none absolute bottom-[2.5%] text-[10px] tracking-[0.16em] text-paper-foreground/40 ${
          side === "left" ? "left-[8%]" : "right-[8%]"
        }`}
      >
        {pageNumber <= total ? pageNumber : ""}
      </span>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
      style={{ transform: direction === "left" ? "rotate(180deg)" : undefined }}
    >
      <path
        d="m9 5 7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
