"use client";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { Polaroid } from "@/components/scrapbook/polaroid";
import { GALLERY_ORDER_KEY } from "@/lib/photo-order";
import type { Photo } from "@/lib/photos";
import { useShuffledPhotos } from "@/lib/use-shuffled-photos";

/** Varied tilts — picks up where the hero's rotation sequence leaves off. */
const TILTS = [-2.4, 1.9, -1.1, 2.7, -2.9, 1.5];

type PhotoGalleryProps = {
  photos: readonly Photo[];
};

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const ordered = useShuffledPhotos(photos, GALLERY_ORDER_KEY);

  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="relative mt-8 scroll-mt-24 sm:mt-12 md:scroll-mt-28"
    >
      <h2 id="gallery-heading" className="sr-only">
        Photo gallery
      </h2>

      {ordered.length === 0 ? (
        <p className="mx-auto max-w-sm bg-paper px-6 py-10 text-center font-decorative text-xl text-paper-foreground shadow-sm">
          Nothing pinned here yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-14 lg:grid-cols-3">
          {ordered.map((photo, index) => (
            <li
              key={photo.id}
              /* Staggered offsets keep the grid from reading as a table. */
              className={`relative ${index % 2 === 1 ? "sm:mt-8" : ""}`}
            >
              <Polaroid
                photo={photo}
                rotation={TILTS[index % TILTS.length]}
                sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw"
                interactive
                bow={index % 4 === 1}
                heart={index % 5 === 2}
              />

              {index % 3 === 0 ? (
                <HeartDoodle className="scrapbook-float pointer-events-none absolute -top-4 right-1/4 h-6 w-6 text-warm-charcoal/70" />
              ) : null}

              {index % 5 === 3 ? (
                <BowSticker className="scrapbook-sway pointer-events-none absolute -bottom-2 left-3 text-2xl" />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
