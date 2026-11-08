"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { coverPhotoId, type Collection } from "@/lib/collections/catalog";

const TILTS = [-1.6, 1.2, -0.9, 1.8, -1.2, 0.8];

type CollectionCardProps = {
  collection: Collection;
  /** Position in its grid, for the scrapbook tilt rhythm. */
  index: number;
  onTogglePin: (collection: Collection) => void;
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
};

/** A collection as a paper-covered scrapbook page: photo cover, name, count. */
export function CollectionCard({
  collection,
  index,
  onTogglePin,
  onEdit,
  onDelete,
}: CollectionCardProps) {
  // The cover is resolved from the gallery's photo list, so a card never shows
  // an image the Gallery does not hold.
  const { photos } = useGalleryPhotos();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const coverId = coverPhotoId(collection);
  const cover = photos.find((photo) => photo.id === coverId);
  const count = collection.photoIds.length;

  /**
   * The menu is portalled with fixed coordinates: the card is transformed (its
   * scrapbook tilt), which would otherwise trap the menu beneath the fixed
   * mobile bottom bar, where a tap lands on the navigation instead. It flips
   * above the trigger when there is no room below.
   */
  const placeMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const width = 160;
    const height = 128;
    const gap = 8;
    const below = rect.bottom + gap;
    const top =
      below + height > window.innerHeight - gap
        ? Math.max(gap, rect.top - height - gap)
        : below;
    const left = Math.min(
      Math.max(gap, rect.right - width),
      window.innerWidth - width - gap,
    );

    setMenuPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          setMenuOpen(false);
        }

        return;
      }

      const target = event.target as Node;

      if (
        !menuRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", placeMenu, true);
    window.addEventListener("resize", placeMenu);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", placeMenu, true);
      window.removeEventListener("resize", placeMenu);
    };
  }, [menuOpen, placeMenu]);

  return (
    <article
      className="scrapbook-tilt scrapbook-lift relative"
      style={{ "--tilt": `${TILTS[index % TILTS.length]}deg` } as React.CSSProperties}
    >
      <Link
        href={`/collections/${collection.id}`}
        className="block cursor-pointer rounded-[14px] bg-paper p-2 pb-2.5 shadow-[0_16px_34px_-20px_rgba(73,52,61,0.75)] ring-1 ring-paper-edge"
      >
        <div className="relative aspect-square overflow-hidden rounded-[6px] bg-paper-edge">
          {cover ? (
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 22vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 bg-blush-pink/50">
              <HeartDoodle className="h-7 w-7 text-paper-foreground/40" />
              <span className="text-[10px] tracking-[0.16em] text-paper-foreground/50 uppercase">
                Empty page
              </span>
            </div>
          )}

          {collection.pinned ? (
            <span className="absolute top-1 left-1 rounded-full bg-paper/90 px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em] text-deep-candy-pink uppercase">
              Pinned
            </span>
          ) : null}

          {collection.pinned ? (
            <BowSticker className="pointer-events-none absolute -top-3 -right-2 rotate-6 text-xl drop-shadow-sm" />
          ) : null}
        </div>

        <div className="px-1 pt-2">
          <h3 className="truncate font-decorative text-xl leading-tight text-paper-foreground">
            {collection.name}
          </h3>
          <p className="text-[11px] text-paper-foreground/60">
            {count === 0
              ? "No photos yet"
              : `${count} photo${count === 1 ? "" : "s"}`}
          </p>
        </div>
      </Link>

      <div className="absolute top-3 right-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            if (!menuOpen) {
              placeMenu();
            }

            setMenuOpen((open) => !open);
          }}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          aria-label={`Actions for ${collection.name}`}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-paper/90 text-paper-foreground shadow-sm ring-1 ring-paper-edge transition-colors hover:bg-blush-pink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <circle cx="6" cy="12" r="1.6" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            <circle cx="18" cy="12" r="1.6" fill="currentColor" />
          </svg>
        </button>

        {menuOpen
          ? createPortal(
              <div
                ref={menuRef}
                id={menuId}
                style={{ top: menuPosition.top, left: menuPosition.left }}
                className="fixed z-[60] w-40 overflow-hidden rounded-xl border border-paper-edge bg-paper py-1 shadow-[0_18px_40px_-24px_rgba(73,52,61,0.9)]"
              >
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    onTogglePin(collection);
                  }}
                >
                  {collection.pinned ? "Unpin" : "Pin to top"}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(collection);
                  }}
                >
                  Edit details
                </MenuItem>
                <MenuItem
                  tone="danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(collection);
                  }}
                >
                  Delete
                </MenuItem>
              </div>,
              document.body,
            )
          : null}
      </div>
    </article>
  );
}

function MenuItem({
  children,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-blush-pink/60 ${
        tone === "danger" ? "text-danger" : "text-paper-foreground"
      }`}
    >
      {children}
    </button>
  );
}
