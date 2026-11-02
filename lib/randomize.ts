/**
 * Order randomisation rules.
 *
 * Pure functions only — no storage and no React — so the rules can be executed
 * and checked directly. The browser wiring lives in `photo-order.ts` and
 * `use-shuffled-photos.ts`.
 */

/** Longest run of reshuffles before falling back to a guaranteed-safe order. */
const MAX_RESHUFFLE_ATTEMPTS = 24;

export type RandomSource = () => number;

/** Fisher-Yates shuffle that returns a new array and never mutates the input. */
export function shuffle<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }

  return result;
}

/** True when two id sequences are identical, position by position. */
export function isSameOrder(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Produces this visit's order for `ids`.
 *
 * Rules, in priority order:
 * 1. A single id has only one arrangement, so it is returned as-is.
 * 2. The previous visit's order is never repeated when another arrangement
 *    exists. The resuffle loop plus the rotation fallback guarantee this even
 *    for collections of two.
 * 3. When there are three or more images, the previous first image is swapped
 *    away so the visit does not open on the same photo twice in a row.
 *
 * A `previous` order that no longer matches the current ids (photos added or
 * removed) is filtered to the ids that still exist and cannot block rule 1.
 */
export function pickOrder(
  ids: readonly string[],
  previous: readonly string[] | null | undefined,
  random: RandomSource = Math.random,
): string[] {
  if (ids.length < 2) {
    return [...ids];
  }

  const knownIds = new Set(ids);
  const previousIds = (previous ?? []).filter((id) => knownIds.has(id));
  const isComparable = previousIds.length === ids.length;

  let order = shuffle(ids, random);

  if (isComparable) {
    let attempts = 0;

    while (attempts < MAX_RESHUFFLE_ATTEMPTS && isSameOrder(order, previousIds)) {
      order = shuffle(ids, random);
      attempts += 1;
    }

    // A shuffle can land on the previous arrangement; rotating a sequence of
    // unique ids always produces a different one.
    if (isSameOrder(order, previousIds)) {
      order = [...order.slice(1), order[0]];
    }
  }

  const previousFirst = previousIds[0];

  if (previousFirst !== undefined && order.length > 2 && order[0] === previousFirst) {
    const swapWith = 1 + Math.floor(random() * (order.length - 1));
    [order[0], order[swapWith]] = [order[swapWith], order[0]];
  }

  return order;
}
