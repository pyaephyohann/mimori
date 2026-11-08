"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/collections/confirm-dialog";
import { useToast } from "@/components/toast/toast-provider";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { MAX_PHOTO_TITLE_LENGTH, validatePhotoTitleEdit } from "@/lib/photo-upload";
import type { Photo } from "@/lib/photo";

import { useGalleryPhotos } from "./gallery-photos-provider";
import { HeroImagePicker } from "./hero-image-picker";

const arrowButton =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-paper-edge bg-paper text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink/70 disabled:cursor-not-allowed disabled:opacity-40";

type PhotoLightboxProps = {
  photos: readonly Photo[];
  /** Index into `photos`, or `null` when the viewer is closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /**
   * Offers **Set as HeroCarousel image**. The gallery page opts in; other
   * viewers (collection pages) keep the plain viewer.
   */
  canSetHeroImage?: boolean;
  /**
   * Offers **Edit Title** for the viewed photo. Only the gallery page opts in;
   * the collection pages keep the read-only title.
   */
  canEditTitle?: boolean;
  /**
   * Offers **Delete image** for the viewed photo. Only the gallery page opts in;
   * the collection pages keep the plain viewer.
   */
  canDelete?: boolean;
  /**
   * Called after a deletion has been saved, so the list that owns `photos` can
   * move to another photo (or close) and report a cleanup warning.
   */
  onDeleted?: (photoId: string, warning: string | null) => void;
};

/**
 * The gallery's photo viewer.
 *
 * The photo keeps the polaroid's paper frame. Its title is the photo's own
 * caption and sits on the paper below the picture, so nothing is drawn over the
 * image; a photo without a caption simply shows no title line.
 */
export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  canSetHeroImage = false,
  canEditTitle = false,
  canDelete = false,
  onDeleted,
}: PhotoLightboxProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [heroOpen, setHeroOpen] = useState(false);
  // A saved title goes into the shared photo store, so the viewer, the grid
  // behind it and every other picker show it without a reload. A deletion
  // leaves that same store, so the grid, the counter and the pickers agree.
  const { applyPhoto, removePhoto } = useGalleryPhotos();
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // A ref stops a second request while the first is still in flight.
  const deletingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [feedback, setFeedback] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  // Leaving a photo ends any edit in progress, so a draft never follows the
  // user to a different photo. Adjusting state while rendering (not in an
  // effect) keeps this in the same render pass.
  const [shownIndex, setShownIndex] = useState(index);
  if (index !== shownIndex) {
    setShownIndex(index);
    setEditing(false);
    setDeleteOpen(false);
    setFeedback(null);
  }

  const photo = index === null ? undefined : photos[index];
  const isOpen = photo !== undefined;

  // Scroll lock and focus: the close button takes focus on open, and whatever
  // was focused before gets it back on close.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || index === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // The picker and the confirmation stacked above handle their own keys,
      // including Escape — closing them must not close the viewer too.
      if (heroOpen || deleteOpen) {
        return;
      }

      // While a title is being edited, Escape cancels the edit and arrow keys
      // belong to the text input, not the photo navigation.
      if (editing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
          setFeedback(null);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        // The picker is reopened per photo, never left over from this one.
        setHeroOpen(false);
        onClose();
        return;
      }

      if (event.key === "ArrowRight" && index < photos.length - 1) {
        event.preventDefault();
        onNavigate(index + 1);
        return;
      }

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onNavigate(index - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, heroOpen, deleteOpen, editing, index, photos.length, onClose, onNavigate]);

  if (!photo || index === null) {
    return null;
  }

  // A photo may arrive without a caption at all; an absent title must render
  // nothing rather than "undefined" or a placeholder.
  const title = (photo.caption ?? "").trim();

  const startEditing = () => {
    setDraft(title);
    setFeedback(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFeedback(null);
  };

  const saveTitle = async () => {
    // A ref blocks a second submit before React re-renders with `saving`.
    if (savingRef.current) {
      return;
    }

    const validation = validatePhotoTitleEdit(draft);

    if (!validation.ok) {
      setFeedback({ tone: "error", message: validation.error });
      return;
    }

    const next = validation.title;
    savingRef.current = true;
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/gallery/${encodeURIComponent(photo.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: next }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        photo?: Photo;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "The title could not be saved.");
      }

      // The stored photo comes back from the server, so nothing is guessed here.
      applyPhoto(data?.photo ?? { ...photo, caption: next, alt: next });
      setEditing(false);
      setFeedback(null);
      showToast("Title updated successfully.");
    } catch (cause: unknown) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The title could not be saved.";

      setFeedback({ tone: "error", message });
      showToast(message, "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const deletePhoto = async (): Promise<{ ok: boolean; error?: string }> => {
    if (deletingRef.current) {
      return { ok: false, error: "That photo is already being deleted." };
    }

    deletingRef.current = true;
    setFeedback(null);

    try {
      const response = await fetch(`/api/gallery/${encodeURIComponent(photo.id)}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string | null;
      } | null;

      if (!response.ok) {
        return {
          ok: false,
          error: data?.error ?? "That photo could not be deleted.",
        };
      }

      // The row is gone, so it leaves the shared list here too. The list that
      // owns the viewer then moves to another photo (or to the empty state).
      removePhoto(photo.id);
      setDeleteOpen(false);
      onDeleted?.(photo.id, data?.warning ?? null);

      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          "That photo could not be deleted. Check your connection and try again.",
      };
    } finally {
      deletingRef.current = false;
    }
  };

  const hasPrevious = index > 0;
  const hasNext = index < photos.length - 1;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
      onClick={() => {
        setHeroOpen(false);
        onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-warm-charcoal/65 p-3 backdrop-blur-sm sm:p-6"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.2,
          ease: "easeOut",
        }}
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-3xl flex-col rounded-[var(--polaroid-radius)] bg-paper p-2.5 pb-2 shadow-[0_30px_80px_-30px_rgba(73,52,61,0.95)] ring-1 ring-paper-edge sm:p-3 sm:pb-2.5"
      >
        <BowSticker className="absolute -top-3.5 right-6 rotate-6 text-2xl drop-shadow-sm" />

        <button
          ref={closeRef}
          type="button"
          onClick={() => {
            setHeroOpen(false);
            onClose();
          }}
          aria-label="Close photo"
          className="absolute top-4 right-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-paper-edge bg-paper/90 text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink/80"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="relative aspect-4/3 max-h-[72vh] w-full overflow-hidden bg-paper-edge">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 640px) 92vw, 768px"
            className="object-contain"
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 px-1.5 pt-2 pb-1">
          {/* Row 1 — the photo title on the left, Edit title on the right. */}
          <div className="min-w-0">
            {editing && canEditTitle ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveTitle();
                }}
              >
                <label
                  htmlFor={`${titleId}-input`}
                  className="shrink-0 text-[10px] font-semibold tracking-[0.18em] text-paper-foreground/55 uppercase"
                >
                  Title
                </label>
                <input
                  id={`${titleId}-input`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={MAX_PHOTO_TITLE_LENGTH}
                  disabled={saving}
                  autoFocus
                  placeholder="A little title"
                  className="min-w-0 flex-1 rounded-full border border-paper-edge bg-surface px-3 py-1.5 font-decorative text-base text-paper-foreground outline-none transition-colors focus-visible:border-primary"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-sm font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p
                  id={titleId}
                  className={`min-w-0 flex-1 truncate font-decorative text-xl leading-tight sm:text-2xl ${
                    title ? "text-paper-foreground" : "text-paper-foreground/55"
                  }`}
                >
                  {title || "Untitled memory"}
                </p>
                {canEditTitle || canDelete ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    {canEditTitle ? (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-paper-foreground/65 transition-colors hover:text-primary"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="h-3 w-3"
                        >
                          <path
                            d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Edit title
                      </button>
                    ) : null}

                    {/* Compact and quiet: the destructive action is available in
                        the title row without competing with the Hero action. */}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback(null);
                          setDeleteOpen(true);
                        }}
                        aria-haspopup="dialog"
                        aria-label="Delete image"
                        title="Delete image"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-danger-border bg-danger-surface text-danger transition-opacity hover:opacity-80"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m3 0-.7 11.6a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7m4 4v5m4-5v5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>
            )}
            {feedback ? (
              <p
                role={feedback.tone === "error" ? "alert" : "status"}
                className={`mt-1 text-xs ${feedback.tone === "error" ? "text-red-700" : "text-paper-foreground/70"}`}
              >
                {feedback.message}
              </p>
            ) : null}
          </div>

          {/* Row 2 — the photo counter on the left, navigation on the right. */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] tracking-[0.18em] text-paper-foreground/55 uppercase">
              {index + 1} of {photos.length}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(index - 1)}
                disabled={!hasPrevious}
                aria-label="Previous photo"
                className={arrowButton}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path
                    d="M14 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onNavigate(index + 1)}
                disabled={!hasNext}
                aria-label="Next photo"
                className={arrowButton}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path
                    d="M10 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

        </div>

        {canSetHeroImage ? (
          <button
            type="button"
            onClick={() => setHeroOpen(true)}
            aria-haspopup="dialog"
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:text-sm"
          >
            <HeartDoodle filled className="h-4 w-4" />
            Set as HeroCarousel Image
          </button>
        ) : null}
      </motion.div>

      {/* The picker is stacked above this viewer, and its clicks must not
          reach the viewer's backdrop-to-close handler. */}
      {heroOpen && canSetHeroImage ? (
        <div onClick={(event) => event.stopPropagation()}>
          <HeroImagePicker
            photo={photo}
            onClose={() => setHeroOpen(false)}
            onSaved={() => {
              // A saved replacement ends the whole flow: the picker and the
              // viewer behind it both close, and the app-wide toast confirms
              // it after they are gone.
              setHeroOpen(false);
              onClose();
              showToast("HeroCarousel image updated successfully.");
            }}
          />
        </div>
      ) : null}

      {/* Stacked above the viewer for the same reason as the picker: its clicks
          and Escape must not reach the viewer behind it. */}
      {deleteOpen && canDelete ? (
        <div onClick={(event) => event.stopPropagation()}>
          <ConfirmDialog
            title="Delete this memory?"
            body="This photo will be permanently deleted from your Gallery."
            confirmLabel="Delete"
            elevated
            onCancel={() => setDeleteOpen(false)}
            onConfirm={deletePhoto}
          />
        </div>
      ) : null}
    </motion.div>
  );
}
