"use client";

import { createContext, useContext } from "react";

export type GalleryUploadContextValue = {
  /** Opens the shared Gallery upload dialog. */
  openUpload: () => void;
};

export const GalleryUploadContext =
  createContext<GalleryUploadContextValue | null>(null);

export function useGalleryUpload(): GalleryUploadContextValue {
  const context = useContext(GalleryUploadContext);

  if (!context) {
    throw new Error(
      "useGalleryUpload must be used inside GalleryUploadProvider",
    );
  }

  return context;
}
