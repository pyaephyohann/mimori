"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import {
  BowSticker,
  CurlyArrow,
  HeartDoodle,
  SpiralDoodle,
} from "@/components/scrapbook/doodles";
import { PhotoPlaceholder } from "@/components/scrapbook/photo-placeholder";
import { Polaroid } from "@/components/scrapbook/polaroid";
import { RunningBorder } from "@/components/scrapbook/running-border";
import { useHeroSlots } from "@/components/hero-slots-provider";
import type { HeroSlot } from "@/lib/hero/slots";
import { HERO_ORDER_KEY } from "@/lib/photo-order";
import { useShuffledPhotos } from "@/lib/use-shuffled-photos";

/** Alternating tilts so neighbouring polaroids never look aligned. */
const TILTS = [-3.4, 2.6, -1.8, 3.2, -2.4, 1.4];

const arrowButton =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40";

type HeroCarouselProps = {
  /**
   * The eight fixed slots. A slot with `photo: null` is empty and drawn as a
   * colourful square — never filled with a borrowed picture.
   */
  slots: readonly HeroSlot[];
  /** True when the slots could not be read; the squares stay, with a note. */
  failed?: boolean;
};

/**
 * An empty slot: the same paper frame and tilt as a polaroid, with a colourful
 * square instead of a photo. It keeps the slide's width, snap position and the
 * carousel's dots/arrows exactly as they are.
 */
function EmptyHeroSlot({
  rotation,
  tone,
  bow,
  heart,
}: {
  rotation: number;
  tone: number;
  bow: boolean;
  heart: boolean;
}) {
  return (
    <figure
      className="scrapbook-tilt relative rounded-[var(--polaroid-radius)] bg-paper p-2.5 pb-1 shadow-[0_14px_34px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge sm:p-3 sm:pb-1"
      style={{ "--tilt": `${rotation}deg` } as CSSProperties}
    >
      <PhotoPlaceholder
        tone={tone}
        label="Empty carousel slot — pick a photo from the gallery to fill it"
        className="rounded-[2px]"
      />

      <figcaption className="px-1.5 pt-2 pb-1.5 text-center font-decorative text-lg leading-tight text-paper-foreground/55 sm:text-xl">
        waiting for a photo
      </figcaption>

      {bow ? (
        <BowSticker className="absolute -top-3.5 -right-3 rotate-6 text-2xl drop-shadow-sm sm:text-3xl" />
      ) : null}

      {heart ? (
        <HeartDoodle
          filled
          className="absolute -top-3 -left-3 h-7 w-7 -rotate-12 text-warm-charcoal/85"
        />
      ) : null}
    </figure>
  );
}

export function HeroCarousel({ slots, failed = false }: HeroCarouselProps) {
  // A replacement made from the gallery is already saved; its response is the
  // newest state, so it is shown instead of this page's render of the slots.
  const { savedSlots } = useHeroSlots();
  const ordered = useShuffledPhotos(savedSlots ?? slots, HERO_ORDER_KEY);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;

    if (!track || !slide) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Measured against the track rather than `offsetLeft`, which is relative
    // to whichever ancestor happens to be positioned.
    const trackRect = track.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();

    track.scrollTo({
      left:
        track.scrollLeft +
        (slideRect.left - trackRect.left) -
        (track.clientWidth - slideRect.width) / 2,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  // Keep the dots in sync with native scrolling (touch swipe, trackpad, buttons).
  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const syncActive = () => {
      const trackRect = track.getBoundingClientRect();
      const centre = trackRect.left + track.clientWidth / 2;
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      Array.from(track.children).forEach((child, index) => {
        const slideRect = (child as HTMLElement).getBoundingClientRect();
        const distance = Math.abs(slideRect.left + slideRect.width / 2 - centre);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });

      setActive(nearest);
    };

    // A fresh visit opens on the first slot of the new order. Browsers restore
    // a scroll container's offset on reload, which would otherwise leave the
    // dots and buttons pointing at a different slide than the one on screen.
    const startAtFirstPhoto = () => {
      track.scrollTo({ left: 0, behavior: "auto" });
      syncActive();
    };

    track.addEventListener("scroll", syncActive, { passive: true });
    startAtFirstPhoto();
    const firstFrame = requestAnimationFrame(startAtFirstPhoto);
    // Restoration can land after the first frame, so run once more when the
    // page has finished loading.
    window.addEventListener("load", startAtFirstPhoto, { once: true });

    return () => {
      cancelAnimationFrame(firstFrame);
      window.removeEventListener("load", startAtFirstPhoto);
      track.removeEventListener("scroll", syncActive);
    };
  }, [ordered.length]);

  const lastIndex = ordered.length - 1;

  return (
    <section aria-labelledby="hero-heading" className="relative">
      <h1 id="hero-heading" className="sr-only">
        Mimori — our love story
      </h1>

      {/* The carousel frame: a static white edge, even internal padding, and the
          clip that keeps the peeking photos inside the rounded container. The
          running border is drawn just inside the white edge. */}
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[var(--carousel-radius)] border-2 border-[var(--brand-white)] p-3 shadow-[0_0_26px_2px_var(--carousel-glow)] sm:border-[3px] sm:p-5">
        <RunningBorder />

        {/* Floating scrapbook stickers, kept out of the reading order. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 hidden sm:block"
        >
          <HeartDoodle className="scrapbook-float absolute top-2 left-2 h-9 w-9 -rotate-12 text-warm-charcoal sm:h-11 sm:w-11" />
          <BowSticker className="scrapbook-sway absolute top-6 right-6 text-3xl" />
          <CurlyArrow className="scrapbook-float absolute bottom-10 left-8 h-8 w-16 text-warm-charcoal/75" />
          <HeartDoodle
            filled
            className="scrapbook-sway absolute right-10 bottom-16 h-5 w-5 text-warm-charcoal/70"
          />
          <SpiralDoodle className="absolute top-16 left-1/3 h-7 w-11 text-warm-charcoal/60" />
        </div>

        {/* The wrapper gives the track's percentage padding a width to resolve
            against, so the first and last slides sit exactly centred. */}
        <div className="w-full [container-type:inline-size]">
          {/* Inline padding is derived from the slide width: neighbours peek at
              both edges while the active slide stays centred. */}
          <div
            ref={trackRef}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label="Featured photos"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" && active > 0) {
                event.preventDefault();
                scrollToIndex(active - 1);
              }

              if (event.key === "ArrowRight" && active < lastIndex) {
                event.preventDefault();
                scrollToIndex(active + 1);
              }
            }}
            className="scrapbook-scroll flex snap-x snap-mandatory gap-6 overflow-x-auto pt-4 pb-6 [--slide-w:86cqi] [padding-inline:calc((100%-var(--slide-w))/2)] [scrollbar-width:none] sm:gap-10 sm:pt-8 sm:[--slide-w:26rem] lg:[--slide-w:30rem] [&::-webkit-scrollbar]:hidden"
          >
            {ordered.map((slot, index) => (
              <div
                key={slot.id}
                className="w-[var(--slide-w)] shrink-0 snap-center"
                aria-label={`Slide ${index + 1} of ${ordered.length}`}
              >
                {slot.photo ? (
                  <Polaroid
                    photo={{ ...slot.photo, caption: slot.title || slot.photo.caption }}
                    rotation={TILTS[index % TILTS.length]}
                    sizes="(max-width: 640px) 86vw, (max-width: 1024px) 416px, 480px"
                    eager={index === 0}
                    bow={index % 2 === 0}
                    heart={index % 3 === 0}
                    interactive
                  />
                ) : (
                  <EmptyHeroSlot
                    rotation={TILTS[index % TILTS.length]}
                    tone={index}
                    bow={index % 2 === 0}
                    heart={index % 3 === 0}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollToIndex(active - 1)}
            disabled={active === 0}
            aria-label="Previous photo"
            className={arrowButton}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="M15 5 8 12l7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <ul className="flex items-center gap-2">
            {ordered.map((slot, index) => (
              <li key={slot.id}>
                <button
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Show slide ${index + 1} of ${ordered.length}`}
                  aria-current={index === active ? "true" : undefined}
                  className={`block h-2.5 cursor-pointer rounded-full transition-all ${
                    index === active
                      ? "w-6 bg-primary"
                      : slot.photo
                        ? "w-2.5 bg-surface/80 ring-1 ring-border hover:bg-surface"
                        : "w-2.5 bg-surface/50 ring-1 ring-primary/40 hover:bg-surface"
                  }`}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => scrollToIndex(active + 1)}
            disabled={active === lastIndex}
            aria-label="Next photo"
            className={arrowButton}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="m9 5 7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {failed ? (
        <p
          role="status"
          className="mt-3 text-center text-xs text-[var(--brand-white)]/90"
        >
          The carousel could not be loaded right now.
        </p>
      ) : null}
    </section>
  );
}
