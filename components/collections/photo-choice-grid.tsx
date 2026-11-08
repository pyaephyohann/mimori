"use client";

import Image from "next/image";

import {
  PHOTO_PLACEHOLDER_COUNT,
  PhotoPlaceholder,
} from "@/components/scrapbook/photo-placeholder";
import type { Photo } from "@/lib/photo";

type PhotoChoiceGridProps = {
  photos: readonly Photo[];
  selectedIds: readonly string[];
  onToggle: (photoId: string) => void;
  /** Marks one selected photo as the cover. Omit to hide cover controls. */
  coverId?: string | null;
  onCover?: (photoId: string) => void;
  disabled?: boolean;
};

/**
 * The gallery, as a selectable grid.
 *
 * The colourful squares come first and are empty slots, not pictures: they have
 * no id, cannot be selected and are never saved. Real gallery photos follow
 * them, and with an empty gallery only the squares are shown.
 *
 * Selection order is displayed as a badge because it becomes the display order
 * of the collection or widget the photos are picked for. Photos are referenced
 * by their `Photo` id, so nothing is uploaded or copied.
 */
export function PhotoChoiceGrid({
  photos,
  selectedIds,
  onToggle,
  coverId = null,
  onCover,
  disabled = false,
}: PhotoChoiceGridProps) {
  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: PHOTO_PLACEHOLDER_COUNT }).map((_, index) => (
          <li
            key={`empty-slot-${index}`}
            aria-hidden="true"
            title="An empty slot — upload a photo on the Gallery page to fill it"
          >
            <div className="overflow-hidden rounded-xl ring-1 ring-paper-edge">
              <PhotoPlaceholder tone={index} />
            </div>
          </li>
        ))}

        {photos.map((photo) => {
          const index = selectedIds.indexOf(photo.id);
          const selected = index !== -1;
          const isCover = selected && coverId === photo.id;

          return (
            <li key={photo.id} className="relative">
              <button
                type="button"
                onClick={() => onToggle(photo.id)}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={
                  selected
                    ? `Remove ${photo.caption || "photo"} from the selection`
                    : `Select ${photo.caption || "photo"}`
                }
                className={`group relative block w-full cursor-pointer overflow-hidden rounded-xl border-2 bg-paper-edge transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-primary"
                    : "border-transparent hover:border-primary/50"
                }`}
              >
                <span className="relative block aspect-square overflow-hidden">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 30vw, 160px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  {selected ? (
                    <span className="absolute inset-0 bg-primary/15" />
                  ) : null}
                </span>

                {selected ? (
                  <span className="absolute top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                ) : null}

                {isCover ? (
                  <span className="absolute right-1 bottom-1 rounded-full bg-paper/95 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-paper-foreground uppercase">
                    Cover
                  </span>
                ) : null}
              </button>

              {selected && onCover ? (
                <button
                  type="button"
                  onClick={() => onCover(photo.id)}
                  className="mt-1 w-full cursor-pointer truncate rounded-full px-1 text-[10px] text-paper-foreground/60 transition-colors hover:text-deep-candy-pink"
                >
                  {isCover ? "Cover photo" : "Use as cover"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {photos.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-paper-edge px-4 py-3 text-center text-[11px] text-paper-foreground/60">
          Your gallery is empty. Upload a photo on the Gallery page and it will
          appear here.
        </p>
      ) : null}
    </div>
  );
}
