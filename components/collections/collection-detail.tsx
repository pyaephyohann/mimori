"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { PhotoLightbox } from "@/components/gallery/photo-lightbox";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { useToast } from "@/components/toast/toast-provider";
import { coverPhotoId } from "@/lib/collections/catalog";
import type { Photo } from "@/lib/photo";

import { ConfirmDialog } from "./confirm-dialog";
import {
  useCollections,
  type CollectionsResult,
} from "./collections-provider";
import { ModalShell } from "./modal-shell";
import { PhotoBook } from "./photo-book";
import { PhotoChoiceGrid } from "./photo-choice-grid";

const TILTS = [-2.2, 1.4, -1.1, 2.4, -1.8, 1.9];

/**
 * One collection: its photos as scrapbook pages, with the management actions
 * that belong to it. Removing a photo or deleting the collection only changes
 * the collection — the gallery photo itself is never touched.
 */
export function CollectionDetail({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const {
    collections,
    status,
    error,
    reload,
    openEdit,
    updateCollection,
    removeCollection,
    movePhotos,
  } = useCollections();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addSelection, setAddSelection] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const collection = collections.find(
    (candidate) => candidate.id === collectionId,
  );

  // The gallery's own list resolves every membership id, so a collection shows
  // exactly the photos the Gallery holds — never a bundled or invented one.
  const { photos } = useGalleryPhotos();
  const photosById = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos],
  );

  const collectionPhotos = useMemo<Photo[]>(() => {
    if (!collection) {
      return [];
    }

    return collection.photoIds.flatMap((id) => {
      const photo = photosById.get(id);
      return photo ? [photo] : [];
    });
  }, [collection, photosById]);

  const addablePhotos = useMemo(() => {
    if (!collection) {
      return [];
    }

    return photos.filter((photo) => !collection.photoIds.includes(photo.id));
  }, [collection, photos]);

  const otherCollections = collections.filter(
    (candidate) => candidate.id !== collectionId,
  );

  const run = async (action: () => Promise<CollectionsResult>) => {
    setBusy(true);
    setActionError(null);

    const result = await action();

    setBusy(false);

    if (!result.ok) {
      setActionError(result.error ?? "That did not work. Try again.");
      return false;
    }

    return true;
  };

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-full bg-paper/40" />
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-paper/50" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-4/3 animate-pulse rounded-[6px] bg-paper/50"
            />
          ))}
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12 lg:px-8">
        <div className="rounded-2xl bg-paper px-6 py-10 text-center shadow-sm ring-1 ring-paper-edge">
          <p className="font-decorative text-2xl text-paper-foreground">
            This page could not be opened
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
      </main>
    );
  }

  if (!collection) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12 lg:px-8">
        <div className="rounded-2xl bg-paper px-6 py-10 text-center shadow-sm ring-1 ring-paper-edge">
          <p className="font-decorative text-2xl text-paper-foreground">
            This collection is missing
          </p>
          <p className="mt-1 text-xs text-paper-foreground/65">
            It may have been deleted. The photos are still in the gallery.
          </p>
          <Link
            href="/collections"
            className="mt-4 inline-block cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            Back to collections
          </Link>
        </div>
      </main>
    );
  }

  const cover = photosById.get(coverPhotoId(collection) ?? "");
  const count = collection.photoIds.length;

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/collections"
          className="cursor-pointer rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink"
        >
          ← All collections
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await run(() =>
                updateCollection(collection.id, {
                  pinned: !collection.pinned,
                }),
              );
            }}
            disabled={busy}
            className="cursor-pointer rounded-full border border-paper-edge bg-paper px-3 py-1.5 text-xs font-medium text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {collection.pinned ? "Unpin" : "Pin"}
          </button>

          <button
            type="button"
            onClick={() => openEdit(collection.id)}
            className="cursor-pointer rounded-full border border-paper-edge bg-paper px-3 py-1.5 text-xs font-medium text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink"
          >
            Edit details
          </button>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="cursor-pointer rounded-full border border-danger-border bg-danger-surface px-3 py-1.5 text-xs font-medium text-danger shadow-sm transition-opacity hover:opacity-85"
          >
            Delete
          </button>
        </div>
      </div>

      <header className="mt-5 flex flex-col gap-4 rounded-2xl bg-paper p-4 shadow-[0_16px_34px_-24px_rgba(73,52,61,0.85)] ring-1 ring-paper-edge sm:flex-row sm:items-center sm:p-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[6px] bg-paper-edge sm:h-28 sm:w-28">
          {cover ? (
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-blush-pink/50">
              <HeartDoodle className="h-8 w-8 text-paper-foreground/40" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.2em] text-paper-foreground/55 uppercase">
            Collection
          </p>
          <h1 className="flex items-center gap-2 font-decorative text-3xl leading-tight text-paper-foreground sm:text-4xl">
            <span className="truncate">{collection.name}</span>
            {collection.pinned ? (
              <BowSticker className="shrink-0 text-xl" />
            ) : null}
          </h1>
          {collection.description ? (
            <p className="mt-1 text-sm text-paper-foreground/70">
              {collection.description}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-paper-foreground/55">
            {count === 0
              ? "No photos yet"
              : `${count} photo${count === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setManaging((current) => !current)}
            aria-pressed={managing}
            className="cursor-pointer rounded-full border border-paper-edge bg-paper px-3 py-2 text-xs font-medium text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink"
          >
            {managing ? "Back to the book" : "Manage photos"}
          </button>

          <button
            type="button"
            onClick={() => {
              setAddSelection([]);
              setAddOpen(true);
            }}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            Add photos
          </button>
        </div>
      </header>

      {actionError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-xs text-danger"
        >
          {actionError}
        </p>
      ) : null}

      {count === 0 ? (
        <div className="mt-10 rounded-2xl bg-paper/90 px-6 py-12 text-center ring-1 ring-paper-edge">
          <HeartDoodle filled className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-2 font-decorative text-2xl text-paper-foreground">
            A blank page, for now
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-paper-foreground/65">
            Add photos from the gallery. They stay in the gallery too, so
            nothing is ever moved out of it.
          </p>
          <button
            type="button"
            onClick={() => {
              setAddSelection([]);
              setAddOpen(true);
            }}
            className="mt-4 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            Add photos
          </button>
        </div>
      ) : managing ? (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-y-10 lg:grid-cols-4">
          {collectionPhotos.map((photo, index) => {
            const isSelected = selected.includes(photo.id);
            const isCover = cover?.id === photo.id;

            return (
              <li
                key={photo.id}
                className={`scrapbook-tilt relative ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                style={
                  { "--tilt": `${TILTS[index % TILTS.length]}deg` } as React.CSSProperties
                }
              >
                <figure className="rounded-[6px] bg-paper p-1.5 pb-1 shadow-[0_14px_30px_-20px_rgba(73,52,61,0.8)] ring-1 ring-paper-edge">
                  <div className="relative aspect-4/3 overflow-hidden rounded-[3px] bg-paper-edge">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 22vw"
                      className="object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => setOpenPhoto(index)}
                      aria-label={
                        photo.caption ? `View “${photo.caption}”` : "View photo"
                      }
                      className="absolute inset-0 z-10 cursor-pointer outline-offset-4"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setSelected((current) =>
                          current.includes(photo.id)
                            ? current.filter((id) => id !== photo.id)
                            : [...current, photo.id],
                        )
                      }
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected
                          ? "Deselect photo"
                          : "Select photo for moving or removing"
                      }
                      className={`absolute top-1.5 left-1.5 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-[11px] font-semibold shadow-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-paper-edge bg-paper/90 text-paper-foreground/70 hover:bg-blush-pink"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </button>

                    {isCover ? (
                      <span className="absolute right-1.5 bottom-1.5 z-20 rounded-full bg-paper/95 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-paper-foreground uppercase">
                        Cover
                      </span>
                    ) : null}
                  </div>

                  <figcaption className="flex items-end justify-between gap-1 px-1 pt-1.5 pb-0.5">
                    <span className="min-w-0 truncate font-decorative text-base leading-tight text-paper-foreground">
                      {(photo.caption ?? "").trim()}
                    </span>

                    <span className="flex shrink-0 items-center gap-1">
                      {!isCover ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await run(() =>
                              updateCollection(collection.id, {
                                coverPhotoId: photo.id,
                              }),
                            );
                          }}
                          disabled={busy}
                          className="cursor-pointer rounded-full px-1 text-[10px] text-paper-foreground/55 transition-colors hover:text-deep-candy-pink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cover
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={async () => {
                          await run(() =>
                            updateCollection(collection.id, {
                              removePhotoIds: [photo.id],
                            }),
                          );
                        }}
                        disabled={busy}
                        className="cursor-pointer rounded-full px-1 text-[10px] text-danger/80 transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      ) : (
        <PhotoBook
          photos={collectionPhotos}
          collectionName={collection.name}
          onOpenPhoto={(index) => setOpenPhoto(index)}
          onClose={() => router.push("/collections")}
        />
      )}

      {selected.length > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-paper-edge bg-paper px-3 py-2 shadow-[0_18px_40px_-24px_rgba(73,52,61,0.95)] lg:bottom-6">
          <span className="text-xs font-medium text-paper-foreground">
            {selected.length} selected
          </span>

          <select
            value={moveTarget}
            onChange={(event) => setMoveTarget(event.target.value)}
            aria-label="Move to collection"
            className="cursor-pointer rounded-full border border-paper-edge bg-surface px-2 py-1 text-xs text-paper-foreground"
          >
            <option value="">Move to…</option>
            {otherCollections.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={busy || moveTarget === ""}
            onClick={async () => {
              const moved = await run(() =>
                movePhotos({
                  fromId: collection.id,
                  toId: moveTarget,
                  photoIds: selected,
                }),
              );

              if (moved) {
                setSelected([]);
                setMoveTarget("");
              }
            }}
            className="cursor-pointer rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const removed = await run(() =>
                updateCollection(collection.id, {
                  removePhotoIds: selected,
                }),
              );

              if (removed) {
                setSelected([]);
              }
            }}
            className="cursor-pointer rounded-full border border-danger-border px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>

          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto cursor-pointer rounded-full px-2 py-1 text-xs text-paper-foreground/60 transition-colors hover:text-paper-foreground"
          >
            Clear
          </button>
        </div>
      ) : null}

      {addOpen ? (
        <ModalShell
          title="Add photos"
          description="Choose from the gallery. Nothing is uploaded or duplicated."
          onClose={() => setAddOpen(false)}
          wide
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-paper-foreground/60">
                {addSelection.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-sm font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || addSelection.length === 0}
                  onClick={async () => {
                    const added = await run(() =>
                      updateCollection(collection.id, {
                        addPhotoIds: addSelection,
                      }),
                    );

                    if (added) {
                      setAddOpen(false);
                      setAddSelection([]);
                    }
                  }}
                  className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Add to collection
                </button>
              </div>
            </div>
          }
        >
          {addablePhotos.length === 0 && photos.length > 0 ? (
            <p className="rounded-2xl border border-dashed border-paper-edge px-4 py-8 text-center text-sm text-paper-foreground/60">
              Every gallery photo is already in this collection.
            </p>
          ) : (
            <PhotoChoiceGrid
              photos={addablePhotos}
              selectedIds={addSelection}
              onToggle={(photoId) =>
                setAddSelection((current) =>
                  current.includes(photoId)
                    ? current.filter((id) => id !== photoId)
                    : [...current, photoId],
                )
              }
              disabled={busy}
            />
          )}
        </ModalShell>
      ) : null}

      {deleteOpen ? (
        <ConfirmDialog
          title="Delete this collection?"
          body={`“${collection.name}” will be removed. The ${count} photo${count === 1 ? "" : "s"} stay in the gallery and in every other collection.`}
          confirmLabel="Delete collection"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={async () => {
            const result = await removeCollection(collection.id);

            // A failure keeps the dialog open, where the error is shown. A
            // deleted collection has no page left, so this one leaves for the
            // list; the toast is app-wide, so it outlives this page.
            if (!result.ok) {
              showToast(
                result.error ?? "That collection could not be deleted.",
                "error",
              );
              return result;
            }

            setDeleteOpen(false);
            showToast("Collection deleted successfully.");
            router.push("/collections");

            return result;
          }}
        />
      ) : null}

      <PhotoLightbox
        photos={collectionPhotos}
        index={openPhoto}
        onClose={() => setOpenPhoto(null)}
        onNavigate={setOpenPhoto}
      />
    </main>
  );
}
