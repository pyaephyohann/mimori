/**
 * Countdown arithmetic for the photobooth.
 *
 * The countdown is driven from a deadline timestamp and drawn on every frame,
 * so a slow or throttled frame cannot make it drift the way a chain of
 * `setTimeout` calls would. This helper turns the remaining time into the
 * number the overlay shows; the hook in `components/photo-booth/countdown.tsx`
 * owns the timing.
 */

export const COUNTDOWN_SECONDS = 3;

/** Seconds left, rounded up, clamped to the countdown's range. */
export function countdownNumber(
  remainingMs: number,
  seconds = COUNTDOWN_SECONDS,
): number {
  if (!Number.isFinite(remainingMs)) {
    return seconds;
  }

  return Math.max(0, Math.min(seconds, Math.ceil(remainingMs / 1000)));
}
