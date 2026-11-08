"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { requestNotifications } from "@/lib/push/client";

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

  // The click that opens the dialog is the app's first meaningful interaction,
  // so it is where notification permission is asked for — once, in the same
  // gesture the browser requires. It runs alongside opening the dialog rather
  // than before it, so a refusal cannot delay or block an upload.
  const openUpload = useCallback(() => {
    setOpen(true);
    void requestNotifications();
  }, []);
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
