"use client";

import { useState } from "react";

import { ModalShell } from "./modal-shell";

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  /** Stacks this confirmation above another open overlay (the photo viewer). */
  elevated?: boolean;
};

/** Confirmation for destructive actions, with the failure shown inline. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  elevated = false,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setPending(true);
    setError(null);

    const result = await onConfirm();

    if (!result.ok) {
      setPending(false);
      setError(result.error ?? "That did not work. Try again.");
    }
  };

  return (
    <ModalShell
      title={title}
      onClose={onCancel}
      elevated={elevated}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-sm font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={pending}
            className="cursor-pointer rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-paper-foreground/80">{body}</p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}
