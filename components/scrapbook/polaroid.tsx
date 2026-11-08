import Image from "next/image";
import type { CSSProperties } from "react";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import type { Photo } from "@/lib/photo";

type PolaroidProps = {
  photo: Photo;
  /** Scrapbook tilt in degrees, driven through the `--tilt` custom property. */
  rotation?: number;
  /** Rendered width hint for `next/image`. */
  sizes: string;
  /** Load immediately instead of lazily — only for the first hero photo. */
  eager?: boolean;
  bow?: boolean;
  heart?: boolean;
  /** Straightens and lifts the photo on hover. */
  interactive?: boolean;
  /**
   * Makes the whole frame a hit area for a viewer. The button is an empty
   * overlay, so the frame keeps its figure/caption structure and no
   * interactive element is nested inside another.
   */
  onOpen?: () => void;
  className?: string;
};

/**
 * A photo in a paper polaroid frame. The frame is a design-system surface, so
 * the handwritten caption is readable on it in both themes. Frames carry no
 * animation of their own — the running border belongs to the hero carousel's
 * outer container.
 */
export function Polaroid({
  photo,
  rotation = 0,
  sizes,
  eager = false,
  bow = false,
  heart = false,
  interactive = false,
  onOpen,
  className = "",
}: PolaroidProps) {
  return (
    <figure
      className={`relative rounded-[var(--polaroid-radius)] bg-paper p-2.5 pb-1 shadow-[0_14px_34px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge sm:p-3 sm:pb-1 ${
        interactive ? "scrapbook-tilt scrapbook-lift" : "scrapbook-tilt"
      } ${className}`}
      style={{ "--tilt": `${rotation}deg` } as CSSProperties}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-paper-edge">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>

      <figcaption className="font-decorative px-1.5 pt-2 pb-1.5 text-lg leading-tight text-paper-foreground sm:text-xl">
        {photo.caption}
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

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={photo.caption ? `View “${photo.caption}”` : "View photo"}
          className="absolute inset-0 z-10 cursor-pointer rounded-[var(--polaroid-radius)] outline-offset-4"
        />
      ) : null}
    </figure>
  );
}
