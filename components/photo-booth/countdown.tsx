"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  COUNTDOWN_SECONDS,
  countdownNumber,
} from "@/lib/photo-booth/countdown";

export type UseCountdown = {
  /** The number the overlay shows; 0 means the shutter is about to fire. */
  value: number;
  running: boolean;
  /** Resolves true when the countdown reached zero, false when cancelled. */
  start: () => Promise<boolean>;
  cancel: () => void;
};

/**
 * A deadline-based 3-2-1 countdown.
 *
 * Every tick recomputes the remaining time from `performance.now()` against one
 * deadline, so a late interval cannot stretch the countdown the way a chain of
 * timeouts would. Hiding the tab pauses it — the remaining time is kept and a
 * fresh deadline is set when the page is visible again — so a phone that locks
 * mid-countdown never fires a surprise photo.
 */
export function useCountdown(seconds = COUNTDOWN_SECONDS): UseCountdown {
  const [value, setValue] = useState(seconds);
  const [running, setRunning] = useState(false);
  const deadlineRef = useRef(0);
  const remainingRef = useRef(seconds * 1000);
  const intervalRef = useRef<number | null>(null);
  const resolveRef = useRef<((completed: boolean) => void) | null>(null);
  const runningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const settle = useCallback(
    (completed: boolean) => {
      clearTimer();
      runningRef.current = false;
      setRunning(false);

      const resolve = resolveRef.current;
      resolveRef.current = null;
      resolve?.(completed);
    },
    [clearTimer],
  );

  const startTicking = useCallback(() => {
    clearTimer();

    intervalRef.current = window.setInterval(() => {
      const remaining = deadlineRef.current - performance.now();

      setValue(countdownNumber(remaining, seconds));

      if (remaining <= 0) {
        settle(true);
      }
    }, 100);
  }, [clearTimer, seconds, settle]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!runningRef.current) {
        return;
      }

      if (document.hidden) {
        remainingRef.current = Math.max(
          0,
          deadlineRef.current - performance.now(),
        );
        clearTimer();
      } else {
        deadlineRef.current = performance.now() + remainingRef.current;
        startTicking();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearTimer, startTicking]);

  useEffect(() => {
    return () => {
      clearTimer();
      runningRef.current = false;
      resolveRef.current?.(false);
      resolveRef.current = null;
    };
  }, [clearTimer]);

  const start = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        // A second start supersedes the first rather than stacking timers.
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        remainingRef.current = seconds * 1000;
        deadlineRef.current = performance.now() + remainingRef.current;
        setValue(seconds);
        setRunning(true);
        runningRef.current = true;
        startTicking();
      }),
    [seconds, startTicking],
  );

  const cancel = useCallback(() => settle(false), [settle]);

  return useMemo(
    () => ({ value, running, start, cancel }),
    [value, running, start, cancel],
  );
}

type CountdownOverlayProps = {
  value: number;
  caption?: string;
};

/** The big 3-2-1 drawn over the live preview. */
export function CountdownOverlay({
  value,
  caption = "Get ready",
}: CountdownOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-warm-charcoal/25"
    >
      <motion.span
        key={value}
        initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
        className="font-decorative text-8xl leading-none text-white drop-shadow-[0_6px_18px_rgba(73,52,61,0.55)] sm:text-9xl"
      >
        {value > 0 ? value : "📸"}
      </motion.span>
      <p className="text-[10px] font-semibold tracking-[0.24em] text-white/90 uppercase">
        {value > 0 ? caption : "Smile!"}
      </p>
    </div>
  );
}
