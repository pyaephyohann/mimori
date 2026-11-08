"use client";

import { useEffect, useRef, useState } from "react";

import { ModalShell } from "@/components/collections/modal-shell";
import { PlusIcon } from "@/components/nav/nav-icons";
import { useToast } from "@/components/toast/toast-provider";
import { uploadPhotoFile } from "@/lib/gallery-upload-client";
import {
  MAX_PHOTO_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  UPLOAD_FORMAT_LABEL,
  UPLOAD_MIME_TYPES,
  normalizeUploadMime,
  uploadSizeError,
} from "@/lib/photo-upload";

import { useGalleryPhotos } from "./gallery-photos-provider";

/** The picker's accept list, kept in step with the server's allowlist. */
const ACCEPT = UPLOAD_MIME_TYPES.join(",");

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

type UploadStatus = "ready" | "uploading" | "added" | "error";

type QueueItem = {
  key: string;
  file: File;
  /** Local object URL used for the preview; revoked when the item leaves. */
  previewUrl: string;
  /** The photo's own optional title, kept through uploads and retries. */
  title: string;
  status: UploadStatus;
  /** 0–100 while uploading. */
  progress: number;
  message?: string;
  /** True when the photo is already in the gallery. */
  duplicate?: boolean;
  /** Upload failures can be attempted again; invalid files cannot. */
  retryable?: boolean;
};

let nextKey = 0;

function fileSignature(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function toQueueItem(file: File): QueueItem {
  const declaredType = normalizeUploadMime(file.type);
  const sizeError = uploadSizeError(file.size);

  const message =
    sizeError ??
    (declaredType
      ? undefined
      : `Only ${UPLOAD_FORMAT_LABEL} images can be uploaded.`);

  return {
    key: `upload-${++nextKey}`,
    file,
    previewUrl: URL.createObjectURL(file),
    title: "",
    status: message ? "error" : "ready",
    progress: 0,
    message,
  };
}

type GalleryUploadDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * The Gallery's upload dialog.
 *
 * Photos are chosen from the device, previewed, then uploaded one at a time so
 * each has its own progress and result. Successful photos are registered in the
 * database; the gallery refreshes once the batch finishes.
 *
 * It is mounted once by `GalleryUploadProvider` and hidden when closed, so a
 * closed dialog keeps its queue instead of dropping it.
 */
export function GalleryUploadDialog({ open, onClose }: GalleryUploadDialogProps) {
  // New photos must appear in the gallery grid and the collection and widget
  // pickers straight away, not only after a full reload of the page.
  const { reload: reloadGalleryPhotos } = useGalleryPhotos();
  const { showToast } = useToast();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs are only revoked when the queue item leaves or this component
  // unmounts — never on every render, or a live preview would break.
  const itemsRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) {
      return;
    }

    setNotice(null);

    const seen = new Set(items.map((item) => fileSignature(item.file)));
    const additions: QueueItem[] = [];
    let skipped = 0;

    for (const file of Array.from(list)) {
      const signature = fileSignature(file);

      if (seen.has(signature) || items.length + additions.length >= MAX_UPLOAD_FILES) {
        skipped += 1;
        continue;
      }

      seen.add(signature);
      additions.push(toQueueItem(file));
    }

    if (additions.length > 0) {
      setItems((current) => [...current, ...additions]);
    }

    if (skipped > 0) {
      setNotice(
        `Up to ${MAX_UPLOAD_FILES} photos at a time, and the same file only once.`,
      );
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const setItemTitle = (key: string, title: string) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, title } : item)),
    );
  };

  const removeItem = (key: string) => {
    const target = items.find((item) => item.key === key);

    if (target && target.status !== "uploading") {
      URL.revokeObjectURL(target.previewUrl);
    }

    setItems((current) => current.filter((item) => item.key !== key));
    setNotice(null);
  };

  const retryItem = (key: string) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key && item.retryable
          ? { ...item, status: "ready", progress: 0, message: undefined, retryable: false }
          : item,
      ),
    );
  };

  const clearFinished = () => {
    items
      .filter((item) => item.status === "added")
      .forEach((item) => URL.revokeObjectURL(item.previewUrl));

    setItems((current) => current.filter((item) => item.status !== "added"));
    setNotice(null);
  };

  /**
   * Empties the queue when the dialog is done with. The uploaded photos are
   * already in the gallery, so this only releases the local previews and the
   * selection state — it never touches Cloudinary or the database.
   */
  const resetQueue = () => {
    itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setNotice(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const uploadAll = async () => {
    const pending = items.filter((item) => item.status === "ready");

    if (pending.length === 0 || uploading) {
      return;
    }

    setUploading(true);
    setNotice(null);

    let added = 0;

    for (const queued of pending) {
      setItems((current) =>
        current.map((item) =>
          item.key === queued.key
            ? { ...item, status: "uploading", progress: 0, message: undefined }
            : item,
        ),
      );

      try {
        const result = await uploadPhotoFile(queued.file, {
          title: queued.title.trim() || undefined,
          onProgress: (percent) => {
            setItems((current) =>
              current.map((item) =>
                item.key === queued.key ? { ...item, progress: percent } : item,
              ),
            );
          },
        });

        added += 1;

        setItems((current) =>
          current.map((item) =>
            item.key === queued.key
              ? {
                  ...item,
                  status: "added",
                  progress: 100,
                  duplicate: result.duplicate,
                  message: result.duplicate
                    ? "Already in the gallery"
                    : "Added to the gallery",
                }
              : item,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "That photo could not be uploaded.";

        setItems((current) =>
          current.map((item) =>
            item.key === queued.key
              ? {
                  ...item,
                  status: "error",
                  message,
                  retryable: true,
                }
              : item,
          ),
        );
      }
    }

    setUploading(false);

    if (added > 0) {
      // The grid and every picker read the shared photo store, so one reload of
      // it is enough — no page render has to be repeated.
      reloadGalleryPhotos();
      const message =
        added === 1
          ? "Photo uploaded successfully."
          : `${added} photos uploaded successfully.`;

      setNotice(
        added === 1 ? "1 photo added to the gallery." : `${added} photos added to the gallery.`,
      );
      showToast(message);
    } else {
      const message =
        "No photos were added. Check the messages above and try again.";

      setNotice(message);
      showToast(message, "error");
    }
  };

  const pending = items.filter((item) => item.status === "ready");
  const added = items.filter((item) => item.status === "added");
  const failed = items.filter((item) => item.status === "error");

  if (!open) {
    return null;
  }

  return (
    <ModalShell
      title="Upload photos"
      description="Your photos will appear in your gallery."
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            aria-live="polite"
            className={`min-h-4 text-xs ${
              notice ? "text-deep-candy-pink" : "text-paper-foreground/60"
            }`}
          >
            {notice ??
              (failed.length > 0 && !uploading
                ? "Some photos were not added."
                : "")}
          </p>

          <div className="flex items-center gap-2">
            {added.length > 0 && pending.length > 0 && !uploading ? (
              <button
                type="button"
                onClick={clearFinished}
                className="cursor-pointer rounded-full border border-paper-edge px-3 py-1.5 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
              >
                Clear added
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                // With nothing left to upload, this is the way out of the
                // dialog; the next open starts from an empty queue.
                if (pending.length === 0 && added.length > 0) {
                  resetQueue();
                  onClose();
                  return;
                }

                void uploadAll();
              }}
              disabled={uploading || (pending.length === 0 && added.length === 0)}
              className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
            >
              {uploading
                ? "Uploading…"
                : pending.length > 0
                  ? `Upload ${pending.length} photo${pending.length === 1 ? "" : "s"}`
                  : "Done"}
            </button>
          </div>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-paper-edge bg-blush-pink/25 px-4 py-10 text-center">
          <p className="font-decorative text-xl text-paper-foreground">
            Pick a few memories
          </p>
          <p className="mt-1 text-xs text-paper-foreground/65">
            {UPLOAD_FORMAT_LABEL} · up to {MAX_UPLOAD_FILES} at a time ·{" "}
            {MAX_MEGABYTES} MB each
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Choose photos
          </button>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.key}
                className="overflow-hidden rounded-2xl border border-paper-edge bg-paper"
              >
                <div className="relative">
                  <div
                    role="img"
                    aria-label={item.file.name}
                    className="block aspect-square bg-paper-edge bg-cover bg-center"
                    style={{ backgroundImage: `url("${item.previewUrl}")` }}
                  />

                  {item.status === "uploading" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/80">
                      <p className="text-sm font-semibold text-paper-foreground">
                        {item.progress}%
                      </p>
                      <div
                        role="progressbar"
                        aria-label={`Uploading ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                        className="h-1.5 w-3/4 overflow-hidden rounded-full bg-paper-edge"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {item.status === "added" ? (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-success-surface px-2 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success-border">
                      {item.duplicate ? "Already added" : "Added"}
                    </span>
                  ) : null}

                  {item.status !== "uploading" ? (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={`Remove ${item.file.name}`}
                      className="absolute top-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-paper/90 text-paper-foreground shadow-sm transition-colors hover:bg-blush-pink/80"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                        <path
                          d="m6 6 12 12M18 6 6 18"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>

                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] text-paper-foreground/70">
                    {item.file.name}
                  </p>
                  {item.status === "ready" ||
                  (item.status === "error" && item.retryable) ? (
                    <label className="mt-1 block">
                      <span className="sr-only">Title for {item.file.name}</span>
                      <input
                        type="text"
                        value={item.title}
                        maxLength={MAX_PHOTO_TITLE_LENGTH}
                        onChange={(event) =>
                          setItemTitle(item.key, event.target.value)
                        }
                        placeholder="Add a title (optional)"
                        className="w-full rounded-lg border border-paper-edge bg-paper px-2 py-1 font-decorative text-sm text-paper-foreground placeholder:font-sans placeholder:text-[11px] placeholder:text-paper-foreground/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  ) : item.title ? (
                    <p className="mt-0.5 truncate font-decorative text-sm text-paper-foreground">
                      {item.title}
                    </p>
                  ) : null}
                  {item.message ? (
                    <p
                      role={item.status === "error" ? "alert" : undefined}
                      className={`mt-0.5 text-[10px] leading-tight ${
                        item.status === "error"
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      {item.message}
                    </p>
                  ) : null}
                  {item.status === "error" && item.retryable ? (
                    <button
                      type="button"
                      onClick={() => retryItem(item.key)}
                      className="mt-1 cursor-pointer rounded-full border border-paper-edge px-2 py-0.5 text-[10px] font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || items.length >= MAX_UPLOAD_FILES}
              className="cursor-pointer rounded-full border border-paper-edge px-3.5 py-1.5 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Add more photos
            </button>

            <p className="text-[11px] text-paper-foreground/55">
              {UPLOAD_FORMAT_LABEL} · {MAX_MEGABYTES} MB each
            </p>
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => addFiles(event.target.files)}
      />
    </ModalShell>
  );
}
