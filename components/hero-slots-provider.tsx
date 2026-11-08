"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { HeroSlot } from "@/lib/hero/slots";

/**
 * The carousel's slots, shared by every route that can change or show them.
 *
 * The home page renders the eight slots on the server, and the only place they
 * are changed is the gallery's replacement dialog. Keeping the saved response
 * here means the carousel shows the new picture as soon as the visitor returns
 * to it, instead of waiting for a reload of the page it came from.
 *
 * `savedSlots` is `null` until a save happens, so the server-rendered slots are
 * used untouched in the ordinary case. The database stays the source of truth:
 * this holds the response to a write the server has already accepted.
 */

type HeroSlotsContextValue = {
  /** The slots written by the most recent successful save; `null` before one. */
  savedSlots: HeroSlot[] | null;
  applySlots: (slots: readonly HeroSlot[]) => void;
};

const HeroSlotsContext = createContext<HeroSlotsContextValue | null>(null);

export function HeroSlotsProvider({ children }: { children: ReactNode }) {
  const [savedSlots, setSavedSlots] = useState<HeroSlot[] | null>(null);

  const applySlots = useCallback((slots: readonly HeroSlot[]) => {
    setSavedSlots([...slots]);
  }, []);

  const value = useMemo<HeroSlotsContextValue>(
    () => ({ savedSlots, applySlots }),
    [savedSlots, applySlots],
  );

  return (
    <HeroSlotsContext.Provider value={value}>
      {children}
    </HeroSlotsContext.Provider>
  );
}

export function useHeroSlots(): HeroSlotsContextValue {
  const context = useContext(HeroSlotsContext);

  if (!context) {
    throw new Error("useHeroSlots must be used inside <HeroSlotsProvider>.");
  }

  return context;
}
