"use client";

import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { PhotoLightbox } from "@/components/gallery/photo-lightbox";
import { FolderIcon } from "@/components/nav/nav-icons";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { HeartOutline } from "@/components/scrapbook/heart-outline";
import {
  PHOTO_PLACEHOLDER_COUNT,
  PhotoPlaceholder,
} from "@/components/scrapbook/photo-placeholder";
import { useToast } from "@/components/toast/toast-provider";
import {
  COLLECTION_SORTS,
  COLLECTION_SORT_LABELS,
  type Collection,
  type CollectionSort,
  isCollectionSort,
  matchesQuery,
  sortCollections,
} from "@/lib/collections/catalog";

import { CollectionCard } from "./collection-card";
import { ConfirmDialog } from "./confirm-dialog";
import { useCollections } from "./collections-provider";

/**
 * The Collections page: a scrapbook of photo folders, iPhone-Photos
 * organisation with paper covers. Everything reads from the collections
 * provider, so the page, the navbar's create action and the dialogs stay in
 * step without a reload.
 */
export function CollectionsPage() {
  const {
    collections,
    status,
    error,
    reload,
    openCreate,
    openEdit,
    updateCollection,
    removeCollection,
  } = useCollections();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CollectionSort>("recent");
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);

  // Recently Added is the gallery itself: the same `Photo` rows, newest first.
  const {
    photos: recentPhotos,
    status: galleryStatus,
    error: galleryError,
    reload: reloadGallery,
  } = useGalleryPhotos();

  const filtered = useMemo(
    () => collections.filter((collection) => matchesQuery(collection, query)),
    [collections, query],
  );

  const pinned = useMemo(
    () =>
      sortCollections(
        filtered.filter((collection) => collection.pinned),
        sort,
      ),
    [filtered, sort],
  );

  const unpinned = useMemo(
    () =>
      sortCollections(
        filtered.filter((collection) => !collection.pinned),
        sort,
      ),
    [filtered, sort],
  );

  const membership = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const collection of collections) {
      for (const photoId of collection.photoIds) {
        map.set(photoId, [...(map.get(photoId) ?? []), collection.name]);
      }
    }

    return map;
  }, [collections]);

  const togglePin = async (collection: Collection) => {
    const result = await updateCollection(collection.id, {
      pinned: !collection.pinned,
    });

    setActionError(result.ok ? null : (result.error ?? null));
  };

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12 lg:px-8 lg:pb-14">
      <header className="text-center">
        <p className="text-[10px] tracking-[0.22em] text-[var(--brand-white)] uppercase">
          Mimori scrapbook
        </p>

        <div className="relative isolate mt-1 inline-flex">
          <HeartOutline className="-inset-x-6 -inset-y-4 text-[var(--brand-white)]/60 sm:-inset-x-8 sm:-inset-y-5" />

          <h1 className="relative flex items-center justify-center gap-2 font-decorative text-4xl leading-none text-[var(--brand-white)] sm:text-5xl">
            <HeartDoodle filled className="h-4 w-4 sm:h-5 sm:w-5" />
            Collections
            <BowSticker className="text-2xl sm:text-3xl" />
          </h1>
        </div>

        <p className="mt-2 text-xs text-[var(--brand-white)] sm:text-sm">
          Every little moment deserves its own place.
        </p>

        {/* Search, count and sort: a flexible search column plus two pills.
            The grid keeps the search from ever running under the count, and on
            mobile the search takes its own row while the pills share the next. */}
        <div className="mx-auto mt-6 grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-3">
          <label className="relative col-span-2 w-full sm:col-span-1">
            <span className="sr-only">Search collections</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-paper-foreground/45"
            >
              <circle cx="10.5" cy="10.5" r="5.8" stroke="currentColor" strokeWidth="1.8" />
              <path d="m15.2 15.4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search collections"
              className="h-10 w-full rounded-full border border-paper-edge bg-paper pr-3 pl-9 text-sm text-paper-foreground placeholder:text-paper-foreground/40 shadow-sm"
            />
          </label>

          <p
            aria-live="polite"
            className="inline-flex h-9 items-center gap-1.5 justify-self-start rounded-full bg-blush-pink px-3 text-xs font-medium whitespace-nowrap text-deep-candy-pink shadow-sm ring-1 ring-paper-edge"
          >
            <FolderIcon className="h-4 w-4 shrink-0" />
            {collections.length} collection{collections.length === 1 ? "" : "s"}
          </p>

          <label className="relative shrink-0 justify-self-end">
            <span className="sr-only">Sort collections</span>
            <select
              value={sort}
              onChange={(event) => {
                if (isCollectionSort(event.target.value)) {
                  setSort(event.target.value);
                }
              }}
              className="h-10 cursor-pointer rounded-full border border-paper-edge bg-paper pr-7 pl-3 text-xs text-paper-foreground shadow-sm"
            >
              {COLLECTION_SORTS.map((option) => (
                <option key={option} value={option}>
                  {COLLECTION_SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {actionError ? (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-center text-xs text-danger"
        >
          {actionError}
        </p>
      ) : null}

      {status === "loading" ? (
        <CollectionGridSkeleton />
      ) : status === "error" ? (
        <div className="mt-10 rounded-2xl bg-paper px-6 py-10 text-center shadow-sm ring-1 ring-paper-edge">
          <p className="font-decorative text-2xl text-paper-foreground">
            The shelf is out of reach
          </p>
          <p className="mt-1 text-xs text-paper-foreground/65">
            {error ?? "Collections could not be loaded."}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {pinned.length > 0 ? (
            <section aria-labelledby="pinned-heading" className="mt-10">
              <SectionHeading id="pinned-heading" title="Pinned" />

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {pinned.map((collection, index) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    index={index}
                    onTogglePin={togglePin}
                    onEdit={(target) => openEdit(target.id)}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section
            aria-labelledby="my-collections-heading"
            className={pinned.length > 0 ? "mt-12" : "mt-10"}
          >
            <SectionHeading id="my-collections-heading" title="My collections" />

            {collections.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-paper/90 px-5 py-8 text-center ring-1 ring-paper-edge">
                <p className="font-decorative text-xl text-paper-foreground">
                  No collections yet
                </p>
                <p className="mt-1 text-xs text-paper-foreground/65">
                  Create your first collection to keep your favorite moments
                  together.
                </p>
              </div>
            ) : null}

            {collections.length > 0 && unpinned.length === 0 && pinned.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-paper/90 px-5 py-8 text-center text-sm text-paper-foreground/70 ring-1 ring-paper-edge">
                No collection matches “{query}”.
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {unpinned.map((collection, index) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  index={index + pinned.length}
                  onTogglePin={togglePin}
                  onEdit={(target) => openEdit(target.id)}
                  onDelete={setPendingDelete}
                />
              ))}

              <CreateCollectionCard onClick={openCreate} />
            </div>
          </section>

          <section aria-labelledby="recent-heading" className="mt-14">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2
                  id="recent-heading"
                  className="flex items-center gap-2 font-decorative text-2xl text-[var(--brand-white)] sm:text-3xl"
                >
                  Recently added
                  <HeartDoodle className="h-4 w-4" />
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--brand-white)]/85">
                  Newest gallery photos, filed or not.
                </p>
              </div>

              <Link
                href="/gallery"
                className="shrink-0 cursor-pointer rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink"
              >
                Open the gallery
              </Link>
            </div>

            {galleryStatus === "loading" ? (
              <ul className="mt-4 flex gap-3 pb-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <li
                    key={index}
                    className="aspect-4/5 w-32 shrink-0 animate-pulse rounded-[6px] bg-paper/50 ring-1 ring-paper-edge sm:w-36"
                  />
                ))}
              </ul>
            ) : galleryStatus === "error" ? (
              <div className="mt-4 rounded-2xl bg-paper/95 px-5 py-8 text-center ring-1 ring-paper-edge">
                <p className="text-sm text-paper-foreground/75">
                  {galleryError ?? "The gallery could not be loaded right now."}
                </p>
                <button
                  type="button"
                  onClick={reloadGallery}
                  className="mt-3 cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                >
                  Try again
                </button>
              </div>
            ) : recentPhotos.length === 0 ? (
              <div className="mt-4">
                <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
                  {Array.from({ length: PHOTO_PLACEHOLDER_COUNT }).map((_, index) => (
                    <li
                      key={`recent-empty-${index}`}
                      aria-hidden="true"
                      className="w-32 shrink-0 sm:w-36"
                    >
                      <div className="rounded-[6px] bg-paper p-1.5 shadow-[0_10px_24px_-16px_rgba(73,52,61,0.9)] ring-1 ring-paper-edge">
                        <div className="overflow-hidden rounded-[3px]">
                          <PhotoPlaceholder tone={index} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-[var(--brand-white)]/85">
                  No photos yet. Upload your first one from the Gallery and it
                  will appear here.
                </p>
              </div>
            ) : (
            <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
              {recentPhotos.map((photo, index) => {
                const names = membership.get(photo.id) ?? [];
                const caption = (photo.caption ?? "").trim();

                return (
                  <li key={photo.id} className="shrink-0 snap-start">
                    <button
                      type="button"
                      onClick={() => setOpenPhoto(index)}
                      className="block w-32 cursor-pointer text-left sm:w-36"
                      aria-label={
                        caption ? `View “${caption}”` : "View photo"
                      }
                    >
                      <figure className="rounded-[6px] bg-paper p-1.5 shadow-[0_10px_24px_-16px_rgba(73,52,61,0.9)] ring-1 ring-paper-edge transition-transform duration-300 hover:-translate-y-1">
                        <div className="relative aspect-4/5 overflow-hidden rounded-[3px] bg-paper-edge">
                          <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            sizes="150px"
                            className="object-cover"
                          />
                        </div>
                        <figcaption className="px-0.5 pt-1">
                          {caption ? (
                            <span className="block truncate font-decorative text-base leading-tight text-paper-foreground">
                              {caption}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block truncate text-[10px] text-paper-foreground/55">
                            {names.length === 0
                              ? "Not in a collection"
                              : names.join(", ")}
                          </span>
                        </figcaption>
                      </figure>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}
          </section>
        </>
      )}

      {/* Floating create action: reachable from anywhere on the page, clear of
          the mobile bottom bar and the home indicator. */}
      <button
        type="button"
        onClick={openCreate}
        aria-label="Create a collection"
        className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_30px_-12px_rgba(240,46,141,0.75)] transition-transform hover:scale-105 active:scale-95 lg:right-8 lg:bottom-8"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none">
          <path
            d="M12 5.4v13.2M5.4 12h13.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {pendingDelete ? (
          <ConfirmDialog
            title="Delete this collection?"
            body={`“${pendingDelete.name}” will be removed. Its photos stay in the gallery and in every other collection — only this collection page is deleted.`}
            confirmLabel="Delete collection"
            onCancel={() => setPendingDelete(null)}
            onConfirm={async () => {
              const result = await removeCollection(pendingDelete.id);

              // A failure keeps the dialog open, where the error is shown; only
              // a confirmed deletion closes the flow and is announced.
              if (!result.ok) {
                showToast(
                  result.error ?? "That collection could not be deleted.",
                  "error",
                );
                return result;
              }

              setPendingDelete(null);
              setActionError(null);
              showToast("Collection deleted successfully.");

              return result;
            }}
          />
        ) : null}
      </AnimatePresence>

      <PhotoLightbox
        photos={recentPhotos}
        index={openPhoto}
        onClose={() => setOpenPhoto(null)}
        onNavigate={setOpenPhoto}
      />
    </main>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 font-decorative text-2xl text-[var(--brand-white)] sm:text-3xl"
    >
      <BowSticker className="text-base" />
      {title}
    </h2>
  );
}

function CreateCollectionCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-primary/50 bg-paper/85 p-4 text-center shadow-[0_10px_24px_-20px_rgba(73,52,61,0.9)] transition-colors hover:border-primary hover:bg-paper"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blush-pink text-deep-candy-pink">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
          <path
            d="M12 5.4v13.2M5.4 12h13.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="font-decorative text-lg leading-tight text-paper-foreground">
        Create collection
      </span>
      <span className="text-[10px] tracking-wide text-paper-foreground/55 uppercase">
        A new page for us
      </span>
    </button>
  );
}

function CollectionGridSkeleton() {
  return (
    <div className="mt-10">
      <div className="h-6 w-32 animate-pulse rounded-full bg-paper/40" />
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse rounded-[14px] bg-paper/50 ring-1 ring-paper-edge"
          />
        ))}
      </div>
    </div>
  );
}
