"use client";

import type { StickerPlacement } from "@/lib/photo-booth/compose";
import {
  MAX_STICKER_SIZE,
  MAX_USER_STICKERS,
  MIN_STICKER_SIZE,
} from "@/lib/photo-booth/compose";
import { STICKERS, getSticker, type StickerKey } from "@/lib/photo-booth/stickers";

import { EditorSlider } from "./editor-slider";

type StickerPickerProps = {
  stickers: readonly StickerPlacement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (sticker: StickerKey) => void;
  onRemove: (id: string) => void;
  onResize: (id: string, size: number) => void;
  onRotate: (id: string, rotate: number) => void;
};

/**
 * The sticker drawer.
 *
 * The palette is the shared registry the borders already use, so a sticker the
 * visitor adds is the same glyph a template can carry. Added stickers are
 * listed with their own size and tilt controls; the preview stays the place to
 * position them, and the selected one is outlined there.
 */
export function StickerPicker({
  stickers,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onResize,
  onRotate,
}: StickerPickerProps) {
  const full = stickers.length >= MAX_USER_STICKERS;
  const selected = stickers.find((sticker) => sticker.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs leading-relaxed text-paper-foreground/70">
          Tap a sticker to tuck it onto the print, then drag it anywhere inside
          the paper.
        </p>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {STICKERS.map((sticker) => (
            <button
              key={sticker.key}
              type="button"
              onClick={() => onAdd(sticker.key)}
              disabled={full}
              aria-label={`Add a ${sticker.label.toLowerCase()} sticker`}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-paper-edge bg-white/80 text-xl transition-colors hover:border-primary/60 hover:bg-blush-pink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">{sticker.glyph}</span>
            </button>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-paper-foreground/50">
          {full
            ? `That's all ${MAX_USER_STICKERS} stickers — remove one to add another.`
            : `${stickers.length} of ${MAX_USER_STICKERS} stickers placed`}
        </p>
      </div>

      {stickers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-paper-edge bg-white/60 px-3 py-4 text-center text-xs text-paper-foreground/60">
          No stickers yet. Pick one above to dress up your print.
        </p>
      ) : (
        <ul className="space-y-2">
          {stickers.map((sticker) => {
            const info = getSticker(sticker.sticker);
            const active = sticker.id === selectedId;

            return (
              <li
                key={sticker.id}
                className={`rounded-xl border p-2 transition-colors ${
                  active
                    ? "border-primary bg-blush-pink/50"
                    : "border-paper-edge bg-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(active ? null : sticker.id)}
                    aria-pressed={active}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-left text-xs font-medium text-paper-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      {info.glyph}
                    </span>
                    {info.label}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(sticker.id)}
                    aria-label={`Remove the ${info.label.toLowerCase()} sticker`}
                    className="ml-auto cursor-pointer rounded-full px-2 py-1 text-[11px] font-medium text-deep-candy-pink transition-colors hover:bg-blush-pink/70"
                  >
                    Remove
                  </button>
                </div>

                {active ? (
                  <div className="mt-2 space-y-1.5">
                    <EditorSlider
                      label="Size"
                      value={sticker.size}
                      min={MIN_STICKER_SIZE}
                      max={MAX_STICKER_SIZE}
                      step={0.01}
                      display={`${Math.round(sticker.size * 100)}%`}
                      onChange={(value) => onResize(sticker.id, value)}
                    />
                    <EditorSlider
                      label="Tilt"
                      value={sticker.rotate}
                      min={-180}
                      max={180}
                      step={5}
                      display={`${Math.round(sticker.rotate)}°`}
                      onChange={(value) => onRotate(sticker.id, value)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <p className="text-[11px] text-paper-foreground/50">
          Drag the outlined sticker on the print, or nudge it with the arrow
          keys.
        </p>
      ) : null}
    </div>
  );
}
