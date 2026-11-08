"use client";

import { useEffect } from "react";

/**
 * Registers the Mimori service worker. Production only, so development
 * builds never serve stale cached bundles. Updates install in the background
 * and activate on the next visit; the page is never reloaded underneath the
 * user.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration is progressive enhancement; the site works without it.
    });
  }, []);

  return null;
}
