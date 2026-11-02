"use client";

import { useEffect, useRef, useState } from "react";

import { randomizeForVisit } from "./photo-order";

/**
 * Returns `photos` in a per-visit random order.
 *
 * The first render uses the order it was given, so server and client markup
 * match and there is no hydration mismatch; the stored order is applied after
 * mount. Re-renders — including a new array holding the same photos — keep the
 * current order and never call the randomiser again.
 */
export function useShuffledPhotos<T extends { id: string }>(
  photos: readonly T[],
  storageKey: string,
): readonly T[] {
  const [ordered, setOrdered] = useState<readonly T[]>(photos);
  const appliedSignature = useRef<string | null>(null);

  const signature = photos.map((photo) => photo.id).join("|");

  useEffect(() => {
    if (appliedSignature.current === signature) {
      return;
    }

    appliedSignature.current = signature;
    setOrdered(randomizeForVisit(photos, storageKey));
  }, [photos, signature, storageKey]);

  return ordered;
}
