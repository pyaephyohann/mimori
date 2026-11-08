"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";

import { ModalShell } from "@/components/collections/modal-shell";
import { useHeroSlots } from "@/components/hero-slots-provider";
import { HeartDoodle } from "@/components/scrapbook/doodles";
import { PhotoPlaceholder } from "@/components/scrapbook/photo-placeholder";
import { useToast } from "@/components/toast/toast-provider";
import {
  MAX_HERO_TITLE_LENGTH,
  type HeroSlot,
} from "@/lib/hero/slots";
import type { Photo } from "@/lib/photo";

type HeroState = {
  slots: HeroSlot[];
};

type HeroImagePickerProps = {
  /** The gallery photo being placed in the carousel. */
  photo: Photo;
  onClose: () => void;
  /** Called only after the carousel has saved the photo. */
  onSaved: () => void;
};

/**
 * Chooses which of the eight carousel slots to fill.
 *
 * The slots are read from `/api/hero`, so the dialog shows the carousel exactly
 * as it currently looks — filled and empty slots alike. Empty slots are drawn
 * as colourful squares and keep their place; filling one does not shuffle the
 * others.
 *
 * The gallery photo is sent as an id only; the server resolves its URL from the
 * photo record and validates both the slot and the title.
 */
export function HeroImagePicker({
  photo,
  onClose,
  onSaved,
}: HeroImagePickerProps) {
  const [slots, setSlots] = useState<HeroSlot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const titleId = useId();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  // The carousel reads this store, so a saved replacement shows up on it
  // without the home page being reloaded first.
  const { applySlots } = useHeroSlots();
  const { showToast } = useToast();

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/hero", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | (Partial<HeroState> & { error?: string })
          | null;

        if (!response.ok) {
          throw new Error(
            data?.error ?? "The carousel slots could not be loaded.",
          );
        }

        setSlots(Array.isArray(data?.slots) ? data.slots : []);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setStatus("error");
        setError(
          cause instanceof Error
            ? cause.message
            : "The carousel slots could not be loaded.",
        );
      });

    return () => controller.abort();
  }, [reloadToken]);

  const caption = (photo.caption ?? "").trim();
  const trimmedTitle = title.trim();
  const titleError =
    selected !== null && trimmedTitle === ""
      ? "Give the carousel photo a title."
      : null;

  const replace = async () => {
    if (!selected || busy || trimmedTitle === "") {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/hero", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: selected,
          sourceId: photo.id,
          title: trimmedTitle,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (Partial<HeroState> & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "The carousel photo could not be saved.");
      }

      // The response is the carousel as it now stands: the chosen slot holds
      // the new photo and title, every other slot is untouched.
      if (Array.isArray(data?.slots)) {
        setSlots(data.slots);
        applySlots(data.slots);
      }

      onSaved();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The carousel photo could not be saved.";

      setError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Set as HeroCarousel image"
      description={
        caption
          ? `Choose which slot “${caption}” should fill.`
          : "Choose which slot this picture should fill."
      }
      onClose={close}
      elevated
      wide
      footer={
        <div className="flex flex-col gap-2">
          {selected !== null ? (
            <div className="flex items-center gap-2">
              <label
                htmlFor={titleId}
                className="shrink-0 text-[10px] font-semibold tracking-[0.18em] text-paper-foreground/55 uppercase"
              >
                Title
              </label>
              <input
                id={titleId}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                maxLength={MAX_HERO_TITLE_LENGTH}
                aria-invalid={titleError !== null}
                placeholder="A little title"
                className="min-w-0 flex-1 rounded-full border border-paper-edge bg-surface px-3 py-1.5 font-decorative text-base text-paper-foreground outline-none transition-colors focus-visible:border-primary"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              role="status"
              aria-live="polite"
              className={`min-h-4 text-xs ${
                error || titleError ? "text-danger" : "text-paper-foreground/60"
              }`}
            >
              {error ??
                titleError ??
                (selected ? "One carousel slot selected." : "")}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-sm font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void replace()}
                disabled={busy || selected === null || trimmedTitle === ""}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy ? "Saving…" : "Replace image"}
              </button>
            </div>
          </div>
        </div>
      }
    >
      {status === "loading" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <li
              key={index}
              className="aspect-square animate-pulse rounded-[6px] bg-paper-edge/70"
            />
          ))}
        </ul>
      ) : status === "error" ? (
        <div className="rounded-2xl border border-dashed border-paper-edge px-4 py-8 text-center">
          <p className="text-sm text-paper-foreground/70">
            {error ?? "The carousel slots could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setError(null);
              setReloadToken((token) => token + 1);
            }}
            className="mt-3 cursor-pointer rounded-full border border-paper-edge px-3.5 py-1.5 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
          >
            Try again
          </button>
        </div>
      ) : slots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-paper-edge px-4 py-8 text-center text-sm text-paper-foreground/60">
          The carousel has no slots to fill.
        </p>
      ) : (
        <ul
          aria-label="Carousel slots"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {slots.map((slot, index) => {
            const isSelected = slot.id === selected;
            const slotTitle = slot.title.trim();

            return (
              <li key={slot.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(slot.id);
                    setTitle(slotTitle || caption);
                    setError(null);
                  }}
                  aria-pressed={isSelected}
                  aria-label={
                    slot.photo
                      ? `Replace “${slotTitle || slot.photo.caption || "photo"}”`
                      : `Fill empty carousel slot ${index + 1}`
                  }
                  className={`group block w-full cursor-pointer rounded-[6px] border-2 bg-paper p-1.5 text-left shadow-[0_10px_24px_-18px_rgba(73,52,61,0.8)] transition-colors ${
                    isSelected
                      ? "border-primary"
                      : "border-transparent hover:border-primary/40"
                  }`}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[3px] bg-paper-edge">
                    {slot.photo ? (
                      <Image
                        src={slot.photo.src}
                        alt={slot.photo.alt}
                        fill
                        sizes="(max-width: 640px) 44vw, 180px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <PhotoPlaceholder
                        tone={index}
                        label={`Empty carousel slot ${index + 1}`}
                      />
                    )}

                    {isSelected ? (
                      <span className="absolute inset-0 bg-primary/15" />
                    ) : null}

                    {isSelected ? (
                      <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-sm">
                        ✓
                      </span>
                    ) : null}

                    {slot.photo ? null : (
                      <span className="absolute right-1 bottom-1 rounded-full bg-paper/95 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-paper-foreground/65 uppercase">
                        Empty
                      </span>
                    )}
                  </span>

                  <span className="mt-1 flex items-center gap-1 px-0.5">
                    <HeartDoodle
                      filled={isSelected}
                      className="h-3 w-3 shrink-0 text-primary"
                    />
                    <span className="min-w-0 truncate font-decorative text-sm leading-tight text-paper-foreground">
                      {slot.photo ? slotTitle || "Untitled" : `Slot ${index + 1}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
}
