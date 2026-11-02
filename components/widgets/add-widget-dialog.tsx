"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useState } from "react";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { photos } from "@/lib/photos";
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

import { useWidgets } from "./widgets-provider";
import { WidgetRenderer } from "./widget-renderer";
import { WidgetStylePreview } from "./widget-style-preview";

type Step = "style" | "photos" | "customize";

/**
 * The Add Widgets flow.
 *
 * Style, photos and configuration are separate steps so the photo count can be
 * checked against the chosen style before anything is saved. Uploads are not
 * offered: no upload pipeline exists yet, so the source step says so instead of
 * pretending.
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

  const entry = kind ? getCatalogEntry(kind) : null;
  const isPhotoWidget = (entry?.maxPhotos ?? 0) > 0;

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

  async function submit() {
    if (!kind) {
      return;
    }

    if (isPhotoWidget && entry && photoIds.length < entry.minPhotos) {
      setMessage("Choose the photos this widget should show.");
      return;
    }

    setBusy(true);
    setMessage(null);

    const result = editing
      ? await editWidget(editing.id, { photoIds, text, date, size })
      : await addWidget({ kind, photoIds, text, date, size });

    setBusy(false);

    if (!result.ok) {
      setMessage(result.error ?? "That could not be saved.");
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
                      <WidgetStylePreview kind={candidate.kind} />
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
                    <span
                      title="Photo uploads are not built yet, so new files cannot be added here."
                      className="rounded-full border border-dashed border-paper-edge px-2.5 py-1 text-[11px] text-paper-foreground/45"
                    >
                      Upload a new photo · soon
                    </span>
                  </div>

                  <p className="mb-3 text-xs text-paper-foreground/65">
                    {entry.title} shows{" "}
                    {entry.minPhotos === entry.maxPhotos
                      ? `${entry.minPhotos} photo${entry.minPhotos === 1 ? "" : "s"}`
                      : `${entry.minPhotos}–${entry.maxPhotos} photos`}
                    . Chosen {photoIds.length} of {entry.maxPhotos}.
                  </p>

                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((photo) => {
                      const index = photoIds.indexOf(photo.id);
                      const selected = index !== -1;

                      return (
                        <li key={photo.id}>
                          <button
                            type="button"
                            onClick={() => togglePhoto(photo.id)}
                            aria-pressed={selected}
                            aria-label={`${photo.caption}${selected ? `, chosen number ${index + 1}` : ""}`}
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
                      <WidgetRenderer config={previewConfig} />
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
