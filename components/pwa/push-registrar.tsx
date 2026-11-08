"use client";

import { useEffect } from "react";

import { syncDevicePushState } from "@/lib/push/client";

/**
 * Keeps this device's push subscription in step with the browser.
 *
 * Runs once per load and never prompts: a device that already granted
 * permission is re-registered (which also refreshes a renewed subscription),
 * and one whose permission was revoked is forgotten. Asking for permission is
 * deliberately not done here — it belongs to a real interaction, in
 * `GalleryUploadProvider`'s Add Memory action.
 */
export function PushRegistrar() {
  useEffect(() => {
    void syncDevicePushState();
  }, []);

  return null;
}
