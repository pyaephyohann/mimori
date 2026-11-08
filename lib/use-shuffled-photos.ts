"use client";

import { useEffect, useRef, useState } from "react";

import { randomizeForVisit } from "./photo-order";

/**
 * Returns `photos` in a per-visit random order.
 *
 * Only the order is remembered. The items themselves are always taken from the
 * array passed in, so a photo whose title was just saved — or one whose picture
 * was replaced — shows its new content immediately, without the order having to
 * change. A new or removed photo changes the id signature and is arranged into
 * the order once, after mount: the first render uses the order it was given, so
 * server and client markup match and there is no hydration mismatch.
 */
export function useShuffledPhotos<T extends { id: string }>(
  photos: readonly T[],
  storageKey: string,
): readonly T[] {
  const [order, setOrder] = useState<readonly string[]>(() =>
    photos.map((photo) => photo.id),
  );
  const appliedSignature = useRef<string | null>(null);

  const signature = photos.map((photo) => photo.id).join("|");

  useEffect(() => {
    if (appliedSignature.current === signature) {
      return;
    }

    appliedSignature.current = signature;
    setOrder(
      randomizeForVisit(photos, storageKey).map((photo) => photo.id),
    );
  }, [photos, signature, storageKey]);

  const byId = new Map(photos.map((photo) => [photo.id, photo]));

  return order.flatMap((id) => {
    const photo = byId.get(id);
    return photo ? [photo] : [];
  });
}
