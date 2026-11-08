"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { useToast } from "@/components/toast/toast-provider";
import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  type Collection,
} from "@/lib/collections/catalog";

import { useCollections } from "./collections-provider";
import { ModalShell } from "./modal-shell";
import { PhotoChoiceGrid } from "./photo-choice-grid";

/**
 * The one collection form, used to create a collection and to edit its name
 * and description. It is mounted once in the root layout, so the navbar's
 * "+ Add Collection" opens the same form from any page.
 */
export function CollectionDialog() {
  const { dialog } = useCollections();

  // Always mounted, so the closing form stays in the tree for its exit while
  // the dialog state is already gone.
  return (
    <AnimatePresence>
      {dialog ? (
        <CollectionDialogForm
          key={dialog.mode === "edit" ? dialog.collectionId : "create"}
          mode={dialog.mode}
          collectionId={dialog.mode === "edit" ? dialog.collectionId : null}
        />
      ) : null}
    </AnimatePresence>
  );
}

type CollectionDialogFormProps = {
  mode: "create" | "edit";
  collectionId: string | null;
};

function CollectionDialogForm({ mode, collectionId }: CollectionDialogFormProps) {
  const router = useRouter();
  const { photos } = useGalleryPhotos();
  const { collections, closeDialog, createCollection, updateCollection } =
    useCollections();
  const { showToast } = useToast();

  const existing: Collection | undefined =
    mode === "edit"
      ? collections.find((candidate) => candidate.id === collectionId)
      : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(
    existing?.description ?? "",
  );
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSubmit = trimmedName !== "" && !submitting;

  const togglePhoto = (photoId: string) => {
    setPhotoIds((current) => {
      const next = current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId];

      setCoverId((cover) => {
        if (cover && !next.includes(cover)) {
          return next[0] ?? null;
        }

        return cover ?? next[0] ?? null;
      });

      return next;
    });
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);

    if (mode === "edit" && collectionId) {
      const result = await updateCollection(collectionId, {
        name: trimmedName,
        description: description.trim() === "" ? null : description.trim(),
      });

      setSubmitting(false);

      if (!result.ok) {
        const message = result.error ?? "That collection could not be saved.";
        setError(message);
        showToast(message, "error");
        return;
      }

      closeDialog();
      showToast("Collection updated successfully.");
      return;
    }

    const result = await createCollection({
      name: trimmedName,
      description: description.trim() === "" ? undefined : description.trim(),
      coverPhotoId: coverId ?? photoIds[0] ?? null,
      photoIds,
    });

    setSubmitting(false);

    if (!result.ok || !result.collection) {
      const message = result.error ?? "That collection could not be created.";
      setError(message);
      showToast(message, "error");
      return;
    }

    showToast("Collection created successfully.");
    router.push(`/collections/${result.collection.id}`);
  };

  return (
    <ModalShell
      title={mode === "edit" ? "Edit collection" : "New collection"}
      description={
        mode === "edit"
          ? "Rename it or rewrite the little note underneath."
          : "A new page for a handful of moments."
      }
      onClose={closeDialog}
      wide={mode === "create"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeDialog}
            className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-sm font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create collection"}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-[0.14em] text-paper-foreground/70 uppercase">
            Name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_COLLECTION_NAME_LENGTH}
            required
            autoFocus
            placeholder="Our little trips"
            className="w-full rounded-xl border border-paper-edge bg-surface px-3 py-2 text-sm text-paper-foreground placeholder:text-paper-foreground/35"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-[0.14em] text-paper-foreground/70 uppercase">
            Description <span className="normal-case">(optional)</span>
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
            rows={2}
            placeholder="What this collection is about."
            className="w-full resize-none rounded-xl border border-paper-edge bg-surface px-3 py-2 text-sm text-paper-foreground placeholder:text-paper-foreground/35"
          />
        </label>

        {mode === "create" ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold tracking-[0.14em] text-paper-foreground/70 uppercase">
                Photos <span className="normal-case">(optional)</span>
              </span>
              <span className="text-[11px] text-paper-foreground/55">
                {photoIds.length} chosen
              </span>
            </div>
            <p className="mb-2 text-[11px] text-paper-foreground/60">
              Pick from the gallery now, or add them later on the collection
              page. Photos are referenced, never copied.
            </p>
            <PhotoChoiceGrid
              photos={photos}
              selectedIds={photoIds}
              onToggle={togglePhoto}
              coverId={coverId}
              onCover={setCoverId}
              disabled={submitting}
            />
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-xs text-danger"
          >
            {error}
          </p>
        ) : null}
      </form>
    </ModalShell>
  );
}
