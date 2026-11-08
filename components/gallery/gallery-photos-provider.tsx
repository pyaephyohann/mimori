"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { Photo } from "@/lib/photo";

/**
 * The gallery's photos, for everything in the browser that offers or shows
 * them: collection dialogs and covers, the widget photo step, Recently Added.
 *
 * The list comes from `/api/gallery`, which reads the `Photo` table, so a
 * picker can never offer an image the Gallery does not hold. An empty list is
 * a real empty state; a failed request is an error state and is never dressed
 * up as pictures.
 */

type GalleryPhotosContextValue = {
  photos: Photo[];
  status: "loading" | "ready" | "error";
  /** True once this store has listed the gallery at least once. */
  hasLoaded: boolean;
  error: string | null;
  reload: () => void;
  /**
   * Replaces one photo's entry, or adds it, from a response the server has
   * already accepted. The list stays in the gallery's newest-first order and no
   * refetch is needed.
   */
  applyPhoto: (photo: Photo) => void;
  /** Drops a photo the server has confirmed is deleted. */
  removePhoto: (photoId: string) => void;
};

const GalleryPhotosContext = createContext<GalleryPhotosContextValue | null>(
  null,
);

export function GalleryPhotosProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/gallery", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          throw new Error(
            body?.error ?? "The gallery could not be loaded right now.",
          );
        }

        const data = (await response.json()) as { photos?: Photo[] };

        setPhotos(Array.isArray(data.photos) ? data.photos : []);
        setStatus("ready");
        setHasLoaded(true);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setPhotos([]);
        setStatus("error");
        setError(
          cause instanceof Error
            ? cause.message
            : "The gallery could not be loaded right now.",
        );
      });

    return () => controller.abort();
  }, [reloadToken]);

  const reload = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }, []);

  const applyPhoto = useCallback((photo: Photo) => {
    setPhotos((current) =>
      current.some((candidate) => candidate.id === photo.id)
        ? current.map((candidate) =>
            candidate.id === photo.id ? photo : candidate,
          )
        : // The list is newest first, so a photo the store has not seen yet
          // belongs at the top.
          [photo, ...current],
    );
  }, []);

  const value = useMemo<GalleryPhotosContextValue>(
    () => ({
      photos,
      status,
      hasLoaded,
      error,
      reload,
      applyPhoto,
      removePhoto,
    }),
    [photos, status, hasLoaded, error, reload, applyPhoto, removePhoto],
  );

  return (
    <GalleryPhotosContext.Provider value={value}>
      {children}
    </GalleryPhotosContext.Provider>
  );
}

export function useGalleryPhotos(): GalleryPhotosContextValue {
  const context = useContext(GalleryPhotosContext);

  if (!context) {
    throw new Error(
      "useGalleryPhotos must be used inside GalleryPhotosProvider.",
    );
  }

  return context;
}
