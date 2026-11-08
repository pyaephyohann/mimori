"use client";

import { BowSticker } from "@/components/scrapbook/doodles";

type SaveBarProps = {
  onBack: () => void;
  /** "Back to review" for a new booth, "Back to saved booths" for an edit. */
  backLabel: string;
  onFinish: () => void;
  /** Renders the current composition and saves the JPEG to the device. */
  onDownload: () => void;
  busy: boolean;
  downloading: boolean;
  error: string | null;
};

/**
 * The editor's footer.
 *
 * **Finish editing** renders the print through the canvas exporter so it can be
 * saved; **Download** renders the same thing straight to the device. Neither
 * uploads on its own, and Back keeps every edit, so nothing here can lose a
 * photograph or a decoration.
 */
export function SaveBar({
  onBack,
  backLabel,
  onFinish,
  onDownload,
  busy,
  downloading,
  error,
}: SaveBarProps) {
  return (
    <div className="mt-4 rounded-2xl border border-paper-edge bg-white/80 p-3">
      <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-paper-foreground/60">
        <BowSticker className="text-sm" />
        Your photos stay as they are — only the paper around them changes.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-[11px] text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
        >
          {backLabel}
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloading || busy}
          aria-busy={downloading}
          className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download print"}
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={busy || downloading}
          className="ml-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Polishing your print…" : "Finish editing"}
          <BowSticker className="text-base" />
        </button>
      </div>
    </div>
  );
}
