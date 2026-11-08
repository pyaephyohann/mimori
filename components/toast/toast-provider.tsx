"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { HeartDoodle } from "@/components/scrapbook/doodles";

/**
 * The app's one toast.
 *
 * A toast is a *temporary* confirmation: it is drawn above every page and
 * dialog, disappears on its own, and keeps no history. Anything longer-lived —
 * a failure that needs an action, a record that must still be read later —
 * belongs in the surface that owns it, not here.
 *
 * The provider sits above the whole app so a message survives what caused it:
 * a dialog that closes, a provider store that resets, or a client-side
 * navigation to another page.
 */

export type ToastTone = "success" | "error";

type Toast = {
  /** Changes when the same message is repeated, so its timer restarts. */
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const DURATION = 3000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const text = message.trim();

    if (text === "") {
      return;
    }

    // A new id replaces the message on screen instead of stacking a second
    // one — even when it is the same message, whose timer then starts again.
    nextId.current += 1;
    setToast({ id: nextId.current, message: text, tone });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), DURATION);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toast }: { toast: Toast | null }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] flex justify-center px-4 lg:bottom-8"
    >
      <AnimatePresence>
        {toast ? (
          <motion.p
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            initial={
              prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.18,
              ease: "easeOut",
            }}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-full border px-4 py-2 font-decorative text-sm shadow-[0_18px_40px_-18px_rgba(73,52,61,0.7)] ${
              toast.tone === "error"
                ? "border-danger-border bg-danger-surface text-danger"
                : "border-primary/30 bg-paper text-paper-foreground"
            }`}
          >
            {toast.tone === "error" ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0"
              >
                <path
                  d="M12 8v5m0 3h.01M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <HeartDoodle filled className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
            <span>{toast.message}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }

  return context;
}
