/**
 * Hand-drawn scrapbook doodles.
 *
 * All decoration is `aria-hidden` and inherits `currentColor`, so callers
 * control colour and size with utility classes.
 */

type DoodleProps = {
  className?: string;
};

const HEART_PATH =
  "M20 33.2C11.4 26.6 4.1 20.1 4.6 13.2c.4-5.6 4.8-8.9 9.3-7.7 3.1.8 5 3.3 5.9 6.1.9-2.8 2.9-5.2 6-5.9 4.5-1.1 8.9 2.3 9.3 7.8.5 6.9-6.8 13.5-15.1 19.7Z";

export function HeartDoodle({
  className = "",
  filled = false,
}: DoodleProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d={HEART_PATH}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Loose, looping arrow like the ones sketched between photos. */
export function CurlyArrow({ className = "" }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 84 44"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M3 34c9-14 20-21 28-17 5.6 2.8 6.5 10.4 1.6 12.9-4.4 2.2-8.6-2.6-5.4-7.4C33.4 13.7 47 9.4 58 12.6c7 2 12.4 6.4 17.6 4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M67.4 9.2 78 16l-9.6 7.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Small spiral scribble used as a filler doodle. */
export function SpiralDoodle({ className = "" }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 56 36"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M2 26c4-9 11-15 17-14 5 .8 6.6 6.4 3 8.6-3.2 2-6.6-1.1-4.6-4.4C19.6 11 26.8 6.6 34.4 7.8c6.6 1 13.6 6.6 19.6 4.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Pink bow sticker. Kept as an emoji so it stays a system-rendered sticker. */
export function BowSticker({ className = "" }: DoodleProps) {
  return (
    <span aria-hidden="true" className={`select-none leading-none ${className}`}>
      🎀
    </span>
  );
}
