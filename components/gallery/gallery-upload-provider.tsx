"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  GalleryUploadContext,
  type GalleryUploadContextValue,
} from "./gallery-upload-context";
import { GalleryUploadDialog } from "./gallery-upload";

/**
 * Hosts the Gallery's upload dialog once for the whole application.
 *
 * The navbar's **+ Add Memory** and the button on `/gallery` both open this
 * same dialog, so the upload flow (previews, validation, progress, retries) is
 * implemented once instead of twice. Mounting the dialog here rather than on a
 * page means an in-flight upload is not cancelled by navigating away.
 */
export function GalleryUploadProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openUpload = useCallback(() => setOpen(true), []);
  const closeUpload = useCallback(() => setOpen(false), []);

  const value = useMemo<GalleryUploadContextValue>(
    () => ({ openUpload }),
    [openUpload],
  );

  return (
    <GalleryUploadContext.Provider value={value}>
      {children}
      <GalleryUploadDialog open={open} onClose={closeUpload} />
    </GalleryUploadContext.Provider>
  );
}
