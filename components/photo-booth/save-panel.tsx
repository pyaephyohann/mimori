"use client";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import type { BoothSaveProgress } from "@/lib/photo-booth/save";

type SavePanelProps = {
  /** The print to show: the saved print URL, or the local render. */
  printUrl: string;
  aspectRatio: string;
  saving: boolean;
  downloading: boolean;
  progress: BoothSaveProgress | null;
  error: string | null;
  /** A save or update in this visit has been confirmed by the server. */
  saved: boolean;
  /** This print replaces an existing session's page rather than creating one. */
  updating: boolean;
  onSave: () => void;
  /** Saves the print this panel is showing to the device. */
  onDownload: () => void;
  onBackToEditing: () => void;
  onBackToReview: () => void;
  /** Leaves the editor for the Photo Booth library, where this booth is listed. */
  onGoToBooth: () => void;
  backLabel: string;
};

/**
 * The finished print, and the way it is saved to the Photo Booth.
 *
 * The composition is shown exactly as the canvas renderer drew it. Saving a new
 * booth uploads its captures and its page; saving an edit uploads only the new
 * page and updates the same session, so its photographs are never replaced.
 * This panel only reports what the server actually confirmed, so "Saved"
 * never appears before the session says so.
 */
export function SavePanel({
  printUrl,
  aspectRatio,
  saving,
  downloading,
  progress,
  error,
  saved,
  updating,
  onSave,
  onDownload,
  onBackToEditing,
  onBackToReview,
  onGoToBooth,
  backLabel,
}: SavePanelProps) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;

  const eyebrow = saved
    ? "Saved to Photo Booth"
    : updating
      ? "Saved print · Editing"
      : "Finished print";
  const heading = saved
    ? updating
      ? "Your print is updated"
      : "It's in your Photo Booth"
    : updating
      ? "Update your saved print"
      : "Your print is ready";
  const description = saved
    ? updating
      ? "Your Photo Booth now shows this version, and this booth is still the same one. The photos it was made from were not touched."
      : "Your print is saved in your Photo Booth, with every photo it was made from kept alongside it."
    : updating
      ? "Saving keeps this booth and its original photos — only the printed page is replaced."
      : "This is the exact export — the same rectangles you arranged, drawn by the canvas renderer. Save it to keep it in your Photo Booth.";

  const saveLabel = saving
    ? "Saving…"
    : error
      ? "Try saving again"
      : updating
        ? "Update saved print"
        : "Save Photobooth";

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center">
      <div className="flex justify-center rounded-2xl bg-blush-pink/35 p-4 ring-1 ring-paper-edge">
        {/* The real export: same geometry, drawn by the canvas renderer. */}
        <span
          role="img"
          aria-label="Your finished photobooth print"
          className="block w-full max-w-[22rem] rounded-[10px] bg-contain bg-center bg-no-repeat shadow-[0_18px_40px_-28px_rgba(73,52,61,0.9)]"
          style={{
            backgroundImage: `url("${printUrl}")`,
            aspectRatio,
          }}
        />
      </div>

      <div>
        <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
          {eyebrow}
        </p>
        <h3 className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground">
          {heading}
          {saved ? (
            <HeartDoodle filled className="h-4 w-4 text-candy-pink" />
          ) : (
            <BowSticker className="text-base" />
          )}
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-paper-foreground/70">
          {description}
        </p>

        {saved ? (
          <>
            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-[11px] leading-relaxed text-danger"
              >
                {error}
              </p>
            ) : null}

            {/*
              Three ways out of a confirmed save: the file, the page, the booth.
              This column is only 20rem wide on desktop, so the three controls
              stack instead of wrapping unevenly into two rows.
            */}
            <div className="mt-4 flex flex-col items-stretch gap-2">
              <DownloadButton
                label="Download Print"
                downloading={downloading}
                onClick={onDownload}
                className="w-full justify-center"
              />

              <button
                type="button"
                onClick={onBackToEditing}
                className="w-full cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={onGoToBooth}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Go to Photobooth
                <BowSticker className="text-sm" />
              </button>
            </div>
          </>
        ) : (
          <>
            {progress && !saved ? (
              <div className="mt-3 rounded-xl border border-paper-edge bg-white/80 p-3">
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs font-medium text-paper-foreground"
                >
                  {progress.message}
                </p>

                <div
                  role="progressbar"
                  aria-label="Saving your photobooth"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={done}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-edge"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{
                      width: `${total > 0 ? Math.round((done / total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-[11px] leading-relaxed text-danger"
              >
                {error} Your work is still here, so you can try again.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || downloading}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveLabel}
                {saving ? null : <BowSticker className="text-sm" />}
              </button>

              <DownloadButton downloading={downloading} onClick={onDownload} />

              <button
                type="button"
                onClick={onBackToEditing}
                disabled={saving}
                className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back to editing
              </button>

              <button
                type="button"
                onClick={onBackToReview}
                disabled={saving}
                className="cursor-pointer rounded-full px-3 py-2 text-xs text-paper-foreground/60 underline-offset-2 transition-colors hover:text-paper-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {backLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One download control, worded honestly while the render is running. */
function DownloadButton({
  downloading,
  onClick,
  label = "Download print",
  className = "",
}: {
  downloading: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={downloading}
      aria-busy={downloading}
      className={`cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {downloading ? "Preparing…" : label}
    </button>
  );
}
