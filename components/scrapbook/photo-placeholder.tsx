import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";

/**
 * A colourful square that stands in for a photo that does not exist yet.
 *
 * These are empty states, never pictures: they carry no id, are not selectable
 * and are never saved anywhere. Mimori has no bundled images, so an empty
 * gallery is shown as these tiles rather than as borrowed photos.
 */

/** How many empty tiles a photo picker shows before the real photos. */
export const PHOTO_PLACEHOLDER_COUNT = 3;

/** Four paper-pink combinations, cycled per tile so a row stays lively. */
const TONES: readonly (readonly [string, string, string])[] = [
  ["var(--brand-blush-pink)", "var(--brand-rose-pink)", "var(--brand-soft-white)"],
  ["var(--brand-soft-white)", "var(--brand-blush-pink)", "var(--brand-dusty-rose)"],
  ["var(--brand-rose-pink)", "var(--brand-soft-white)", "var(--brand-candy-pink)"],
  ["var(--brand-blush-pink)", "var(--brand-dusty-rose)", "var(--brand-soft-white)"],
];

type PhotoPlaceholderProps = {
  /** Rotates through the colour combinations. */
  tone?: number;
  /** Square by default; pass a height class to fold it into another frame. */
  className?: string;
  label?: string;
};

export function PhotoPlaceholder({
  tone = 0,
  className = "",
  label = "Empty photo slot",
}: PhotoPlaceholderProps) {
  const [from, via, to] = TONES[tone % TONES.length];

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex aspect-square items-center justify-center overflow-hidden bg-blush-pink ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(135deg, ${from} 0%, ${via} 55%, ${to} 100%)`,
        }}
      />

      {/* Paper confetti, kept purely decorative. */}
      <span
        aria-hidden="true"
        className="absolute -top-4 -left-4 h-12 w-12 rounded-full bg-white/35"
      />
      <span
        aria-hidden="true"
        className="absolute right-1 bottom-1 h-8 w-8 rounded-full bg-white/25"
      />

      <HeartDoodle
        filled
        className="relative h-7 w-7 text-white/85 drop-shadow-sm"
      />
      <BowSticker className="absolute top-0.5 left-0.5 text-base opacity-90" />
    </div>
  );
}
