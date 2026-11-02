"use client";

import { pickOrder } from "./randomize";

/**
 * One storage key per section. The hero and the gallery keep separate
 * "previous order" records so neither can disturb the other's randomness.
 */
export const HERO_ORDER_KEY = "mimori:hero-order";
export const GALLERY_ORDER_KEY = "mimori:gallery-order";

/** Reads a stored id order, tolerating missing, malformed or blocked storage. */
export function readStoredOrder(key: string): string[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === "string")) {
      return null;
    }

    return parsed;
  } catch {
    // Private mode or disabled storage — fall back to a plain random order.
    return null;
  }
}

/** Remembers this visit's order so the next visit can avoid repeating it. */
export function writeStoredOrder(key: string, ids: readonly string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Nothing to recover from: this visit still renders with the new order.
  }
}

/**
 * Reorders `items` for this visit and records the result under `key`.
 * Photos added or removed since the previous visit are handled by `pickOrder`.
 */
export function randomizeForVisit<T extends { id: string }>(
  items: readonly T[],
  key: string,
): readonly T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const order = pickOrder(
    items.map((item) => item.id),
    readStoredOrder(key),
  );

  writeStoredOrder(key, order);

  return order.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}
