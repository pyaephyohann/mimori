"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { useToast } from "@/components/toast/toast-provider";
import { uploadPhotoFile } from "@/lib/gallery-upload-client";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import {
  PHOTO_PLACEHOLDER_COUNT,
  PhotoPlaceholder,
} from "@/components/scrapbook/photo-placeholder";
import {
  SIZE_DIMENSIONS,
  SIZE_LABELS,
  WIDGET_CATALOG,
  WIDGET_SIZES,
  getCatalogEntry,
  type WidgetConfig,
  type WidgetKind,
  type WidgetRecord,
  type WidgetSize,
} from "@/lib/widgets/catalog";

import { widgetUploadFileError } from "@/lib/widgets/photo-upload-selection";

import { useWidgets } from "./widgets-provider";
import { WidgetRenderer } from "./widget-renderer";
import { WidgetStylePreview } from "./widget-style-preview";

type Step = "style" | "photos" | "customize";

/**
 * The Add Widgets flow.
 *
 * Style, photos and configuration are separate steps so the photo count can be
 * checked against the chosen style before anything is saved. The photo step can
 * pick from the Gallery or upload a new photo, which joins the Gallery only.
 */
export function AddWidgetDialog() {
  const { dialog, widgets } = useWidgets();

  const editing =
    dialog?.mode === "edit"
      ? widgets.find((widget) => widget.id === dialog.widgetId) ?? null
      : null;

  if (!dialog) {
    return null;
  }

  // Keyed by widget so each opening starts from its own draft.
  return <WidgetDialogBody key={editing?.id ?? "new"} editing={editing} />;
}

/**
 * Remounted for each opening, so the step and draft start from the widget
 * being edited (or from a blank draft) without syncing state in an effect.
 */
function WidgetDialogBody({ editing }: { editing: WidgetRecord | null }) {
  const { closeDialog, addWidget, editWidget } = useWidgets();
  const { showToast } = useToast();
  // Widgets pick from the Gallery's own photos; there is no bundled list.
  const { photos, reload: reloadGalleryPhotos } = useGalleryPhotos();
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();

  const [step, setStep] = useState<Step>(editing ? "customize" : "style");
  const [kind, setKind] = useState<WidgetKind | null>(editing?.kind ?? null);
  const [photoIds, setPhotoIds] = useState<string[]>(
    editing?.config.photoIds ?? [],
  );
  const [text, setText] = useState(editing?.config.text ?? "");
  const [date, setDate] = useState(editing?.config.date ?? "");
  const [size, setSize] = useState<WidgetSize>(editing?.config.size ?? "md");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against a second upload starting while one is still in flight.
  const uploadingRef = useRef(false);
  const submittingRef = useRef(false);

  const entry = kind ? getCatalogEntry(kind) : null;
  const isPhotoWidget = (entry?.maxPhotos ?? 0) > 0;

  useEffect(() => {
    return () => {
      if (pendingUpload) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }
    };
  }, [pendingUpload]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeDialog]);

  function chooseKind(nextKind: WidgetKind) {
    const nextEntry = getCatalogEntry(nextKind);

    setKind(nextKind);
    setSize(nextEntry.defaultSize);
    setText(nextEntry.defaultText ?? "");
    setPhotoIds([]);
    setMessage(null);
    setStep(nextEntry.maxPhotos > 0 ? "photos" : "customize");
  }

  function togglePhoto(photoId: string) {
    if (!entry) {
      return;
    }

    if (photoIds.includes(photoId)) {
      setPhotoIds(photoIds.filter((id) => id !== photoId));
      setMessage(null);
      return;
    }

    if (photoIds.length >= entry.maxPhotos) {
      setMessage(
        `${entry.title} holds ${entry.maxPhotos} photo${entry.maxPhotos === 1 ? "" : "s"}. Remove one first.`,
      );
      return;
    }

    setPhotoIds([...photoIds, photoId]);
    setMessage(null);
  }

  function chooseUploadFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const fileError = widgetUploadFileError(file);

    if (fileError) {
      setMessage(fileError);
      return;
    }

    setMessage(null);
    setPendingUpload({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelUpload() {
    if (uploadingRef.current) {
      return;
    }

    setPendingUpload(null);
    setMessage(null);
  }

  async function confirmUpload() {
    if (!pendingUpload || !entry || uploadingRef.current) {
      return;
    }

    uploadingRef.current = true;
    setBusy(true);
    setMessage(null);
    setUploadProgress(0);

    try {
      await uploadPhotoFile(pendingUpload.file, {
        onProgress: setUploadProgress,
      });

      // The uploaded photo joins the Gallery list so the user can pick it there.
      // It is not added to this widget; the user selects it separately.
      reloadGalleryPhotos();
      URL.revokeObjectURL(pendingUpload.previewUrl);
      setPendingUpload(null);
      setMessage(null);
    } catch (error) {
      // The file stays in the preview so the user can retry without choosing it again.
      setMessage(
        error instanceof Error ? error.message : "That photo could not be uploaded.",
      );
    } finally {
      uploadingRef.current = false;
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function submit() {
    if (!kind || submittingRef.current) {
      return;
    }

    if (isPhotoWidget && entry && photoIds.length < entry.minPhotos) {
      setMessage("Choose the photos this widget should show.");
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setMessage(null);

    try {
      const result = editing
        ? await editWidget(editing.id, { photoIds, text, date, size })
        : await addWidget({ kind, photoIds, text, date, size });

      if (!result.ok) {
        const message = result.error ?? "That could not be saved.";
        setMessage(message);
        showToast(message, "error");
        return;
      }

      showToast("Widget saved successfully.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const canContinue =
    step === "style"
      ? kind !== null
      : step === "photos"
        ? !!entry && photoIds.length >= entry.minPhotos
        : kind !== null;

  const previewConfig: WidgetConfig | null = kind
    ? {
        kind,
        photoIds,
        text,
        date,
        position: { x: 0, y: 0 },
        size,
        z: 1,
      }
    : null;

  const heading =
    step === "style"
      ? "Add a widget"
      : step === "photos"
        ? "Choose photos"
        : editing
          ? "Edit widget"
          : "Make it yours";

  return (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-warm-charcoal/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={closeDialog}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.22,
              ease: "easeOut",
            }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-paper-edge bg-paper shadow-[0_28px_70px_-30px_rgba(73,52,61,0.9)] sm:max-h-[88vh] sm:rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-paper-edge px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-paper-foreground/55 uppercase">
                  Mimori scrapbook
                </p>
                <h2
                  id={titleId}
                  className="flex items-center gap-2 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
                >
                  {heading}
                  <BowSticker className="text-base" />
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-paper-edge text-paper-foreground transition-colors hover:bg-blush-pink/70"
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
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {step === "style" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {WIDGET_CATALOG.map((candidate) => (
                    <button
                      key={candidate.kind}
                      type="button"
                      onClick={() => chooseKind(candidate.kind)}
                      aria-pressed={kind === candidate.kind}
                      className={`cursor-pointer rounded-2xl border p-2 text-left transition-colors ${
                        kind === candidate.kind
                          ? "border-primary bg-blush-pink/60"
                          : "border-paper-edge hover:border-primary/60 hover:bg-blush-pink/35"
                      }`}
                    >
                      <WidgetStylePreview kind={candidate.kind} photos={photos} />
                      <span className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-paper-foreground">
                          {candidate.title}
                        </span>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] tracking-wide text-paper-foreground/70 uppercase">
                          {candidate.group}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-paper-foreground/70">
                        {candidate.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === "photos" && entry ? (
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blush-pink px-2.5 py-1 text-[11px] font-medium text-paper-foreground">
                      From the gallery
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="cursor-pointer rounded-full border border-dashed border-primary/60 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-blush-pink/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Upload a new photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(event) => {
                        chooseUploadFile(event.target.files?.[0]);
                        // Allows choosing the same file again after a cancel.
                        event.target.value = "";
                      }}
                    />
                  </div>

                  {pendingUpload ? (
                    <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-blush-pink/50 p-3 ring-1 ring-paper-edge sm:flex-row">
                      <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-lg ring-1 ring-paper-edge">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                        <img
                          src={pendingUpload.previewUrl}
                          alt="Selected photo preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <p className="text-xs text-paper-foreground/75">
                          Upload this photo to the gallery? You can pick it for this widget afterwards.
                        </p>
                        {uploadProgress !== null ? (
                          <div
                            role="progressbar"
                            aria-label="Upload progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={uploadProgress}
                            className="h-1.5 w-full overflow-hidden rounded-full bg-paper-edge"
                          >
                            <div
                              className="h-full bg-primary transition-[width]"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        ) : null}
                        <div className="flex justify-center gap-2 sm:justify-start">
                          <button
                            type="button"
                            onClick={cancelUpload}
                            disabled={busy}
                            className="cursor-pointer rounded-full border border-paper-edge px-3 py-1.5 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={confirmUpload}
                            disabled={busy}
                            className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy
                              ? uploadProgress === 100
                                ? "Saving…"
                                : "Uploading…"
                              : message
                                ? "Try again"
                                : "Upload"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <p className="mb-3 text-xs text-paper-foreground/65">
                    {entry.title} shows{" "}
                    {entry.minPhotos === entry.maxPhotos
                      ? `${entry.minPhotos} photo${entry.minPhotos === 1 ? "" : "s"}`
                      : `${entry.minPhotos}–${entry.maxPhotos} photos`}
                    . Chosen {photoIds.length} of {entry.maxPhotos}.
                  </p>

                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: PHOTO_PLACEHOLDER_COUNT }).map(
                      (_, index) => (
                        <li
                          key={`empty-slot-${index}`}
                          aria-hidden="true"
                          title="An empty slot — upload a photo on the Gallery page to fill it"
                        >
                          <span className="block overflow-hidden rounded-lg ring-1 ring-paper-edge">
                            <PhotoPlaceholder tone={index} />
                          </span>
                        </li>
                      ),
                    )}

                    {photos.map((photo) => {
                      const index = photoIds.indexOf(photo.id);
                      const selected = index !== -1;

                      return (
                        <li key={photo.id}>
                          <button
                            type="button"
                            onClick={() => togglePhoto(photo.id)}
                            aria-pressed={selected}
                            aria-label={`${photo.caption || "Photo"}${selected ? `, chosen number ${index + 1}` : ""}`}
                            className={`relative block w-full cursor-pointer overflow-hidden rounded-lg ring-2 transition-all ${
                              selected
                                ? "ring-primary"
                                : "ring-transparent hover:ring-primary/40"
                            }`}
                          >
                            <span className="relative block aspect-square w-full">
                              <Image
                                src={photo.src}
                                alt=""
                                fill
                                sizes="120px"
                                className="object-cover"
                              />
                            </span>
                            {selected ? (
                              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                                {index + 1}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {photos.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-paper-edge px-4 py-3 text-center text-[11px] text-paper-foreground/60">
                      Your gallery is empty. Upload photos first and they will
                      appear here —{" "}
                      <Link
                        href="/gallery"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        open the Gallery
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === "customize" && previewConfig ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                  <div className="rounded-2xl bg-blush-pink/50 p-3 ring-1 ring-paper-edge">
                    <p className="mb-2 text-[10px] tracking-[0.18em] text-paper-foreground/55 uppercase">
                      Preview
                    </p>
                    <div
                      className="relative mx-auto overflow-hidden"
                      style={{
                        width: "100%",
                        maxWidth: SIZE_DIMENSIONS[size].width,
                        aspectRatio: `${SIZE_DIMENSIONS[size].width} / ${SIZE_DIMENSIONS[size].height}`,
                      }}
                    >
                      <WidgetRenderer config={previewConfig} photos={photos} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {kind === "love-note" ? (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-paper-foreground/75">
                          Your note
                        </span>
                        <textarea
                          value={text}
                          onChange={(event) => setText(event.target.value)}
                          rows={4}
                          maxLength={280}
                          placeholder="Something only the two of you would write"
                          className="w-full resize-none rounded-xl border border-paper-edge bg-white/80 px-3 py-2 text-sm text-paper-foreground outline-none placeholder:text-paper-foreground/40 focus:border-primary"
                        />
                      </label>
                    ) : null}

                    {kind === "our-counter" ? (
                      <>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-paper-foreground/75">
                            Counting from
                          </span>
                          <input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className="w-full rounded-xl border border-paper-edge bg-white/80 px-3 py-2 text-sm text-paper-foreground outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-paper-foreground/75">
                            Label
                          </span>
                          <input
                            type="text"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            maxLength={40}
                            placeholder="days together"
                            className="w-full rounded-xl border border-paper-edge bg-white/80 px-3 py-2 text-sm text-paper-foreground outline-none placeholder:text-paper-foreground/40 focus:border-primary"
                          />
                        </label>
                      </>
                    ) : null}

                    {kind === "polaroid" || kind === "memory-frame" ? (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-paper-foreground/75">
                          Caption (optional)
                        </span>
                        <input
                          type="text"
                          value={text}
                          onChange={(event) => setText(event.target.value)}
                          maxLength={60}
                          placeholder="Leave empty to use the photo's caption"
                          className="w-full rounded-xl border border-paper-edge bg-white/80 px-3 py-2 text-sm text-paper-foreground outline-none placeholder:text-paper-foreground/40 focus:border-primary"
                        />
                      </label>
                    ) : null}

                    <div>
                      <span className="mb-1 block text-xs font-medium text-paper-foreground/75">
                        Size
                      </span>
                      <div className="flex gap-2">
                        {WIDGET_SIZES.map((candidate) => (
                          <button
                            key={candidate}
                            type="button"
                            onClick={() => setSize(candidate)}
                            aria-pressed={size === candidate}
                            className={`flex-1 cursor-pointer rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors ${
                              size === candidate
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-paper-edge text-paper-foreground/75 hover:bg-blush-pink/40"
                            }`}
                          >
                            {SIZE_LABELS[candidate]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isPhotoWidget ? (
                      <button
                        type="button"
                        onClick={() => setStep("photos")}
                        className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Change photos
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {message ? (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-danger-surface px-3 py-2 text-xs text-danger"
                >
                  {message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-paper-edge px-4 py-3 sm:px-6">
              <div className="flex items-center gap-1.5 text-[11px] text-paper-foreground/55">
                <HeartDoodle className="h-3.5 w-3.5" />
                Saved for both of you
              </div>

              <div className="flex items-center gap-2">
                {step !== "style" && !editing ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep(
                        step === "customize" && isPhotoWidget ? "photos" : "style",
                      )
                    }
                    className="cursor-pointer rounded-full border border-paper-edge px-3.5 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/50"
                  >
                    Back
                  </button>
                ) : null}

                {step === "photos" ? (
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => setStep("customize")}
                    className="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Preview
                  </button>
                ) : null}

                {step === "customize" ? (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy}
                    className="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : "Add to Home"}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
  );
}
