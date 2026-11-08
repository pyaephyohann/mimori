"use client";

import { useState } from "react";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { PhotoLightbox } from "@/components/gallery/photo-lightbox";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { Polaroid } from "@/components/scrapbook/polaroid";
import { useToast } from "@/components/toast/toast-provider";
import { GALLERY_ORDER_KEY } from "@/lib/photo-order";
import type { Photo } from "@/lib/photo";
import { useShuffledPhotos } from "@/lib/use-shuffled-photos";

/** Varied tilts — picks up where the hero's rotation sequence leaves off. */
const TILTS = [-2.4, 1.9, -1.1, 2.7, -2.9, 1.5];

type PhotoGalleryProps = {
  photos: readonly Photo[];
  /** True when the gallery query failed — distinct from an empty gallery. */
  failed?: boolean;
};

export function PhotoGallery({ photos, failed = false }: PhotoGalleryProps) {
  // The shared photo store is where uploads, title edits and deletions land, so
  // the grid follows it once it has listed the gallery — this page's own render
  // is only the first paint (and the fallback if that request fails).
  const { photos: sharedPhotos, hasLoaded } = useGalleryPhotos();
  const ordered = useShuffledPhotos(
    hasLoaded ? sharedPhotos : photos,
    GALLERY_ORDER_KEY,
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Reported when a photo left the gallery but its stored file could not be
  // removed; the viewer closes, so the message belongs on the page.
  const [notice, setNotice] = useState<string | null>(null);
  // The deletion toast is app-wide, not part of the viewer: it has to stay
  // readable after the viewer and its confirmation have closed.
  const { showToast } = useToast();

  // A saved deletion ends the whole flow: the photo is already out of the
  // shared list, and the viewer closes with the confirmation, so nothing is
  // left over the page when the outcome is announced.
  const handleDeleted = (_photoId: string, warning: string | null) => {
    setOpenIndex(null);

    if (warning) {
      setNotice(warning);
      return;
    }

    setNotice(null);
    showToast("Image deleted successfully.");
  };

  return (
    <>
      <section aria-label="Photo gallery" className="relative">
        {notice ? (
          <p
            role="alert"
            className="mx-auto mb-8 max-w-md rounded-2xl border border-danger-border bg-danger-surface px-4 py-2.5 text-center text-xs leading-relaxed text-danger"
          >
            {notice}
          </p>
        ) : null}

        {ordered.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl bg-paper px-6 py-10 text-center shadow-sm ring-1 ring-paper-edge">
            <p className="font-decorative text-xl text-paper-foreground">
              {failed ? "The gallery could not be loaded" : "No photos yet"}
            </p>
            <p className="mt-1 text-xs text-paper-foreground/65">
              {failed
                ? "The photo table could not be read. Nothing has been lost — try again in a moment."
                : "Upload your first photos using Add Memory above."}
            </p>
          </div>
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
                  onOpen={() => setOpenIndex(index)}
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

      <PhotoLightbox
        photos={ordered}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
        canSetHeroImage
        canEditTitle
        canDelete
        onDeleted={handleDeleted}
      />
    </>
  );
}
