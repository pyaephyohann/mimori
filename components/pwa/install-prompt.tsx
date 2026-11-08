"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "mimori-install-dismissed";
const DISMISS_EVENT = "mimori-install-dismissed-change";

function subscribeNone() {
  return () => {};
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function subscribeDismissed(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

function readDismissed() {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

/**
 * Install affordance. Hidden when already installed or dismissed. Chromium
 * exposes the native prompt, captured here; iOS Safari gets manual steps.
 * Visibility is derived during render, so nothing is set inside an effect.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const standalone = useSyncExternalStore(subscribeNone, isStandalone, () => true);
  const ios = useSyncExternalStore(subscribeNone, isIosSafari, () => false);
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed || dismissed) return null;
  if (!deferred && !ios) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "dismissed") dismiss();
  };

  return (
    <div className="mx-auto mt-3 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm">
      {deferred ? (
        <p>Install Mimori for a full-screen, app-like experience.</p>
      ) : (
        <p>
          To install Mimori, tap <strong>Share</strong> and then{" "}
          <strong>Add to Home Screen</strong>.
        </p>
      )}
      <div className="flex items-center gap-2">
        {deferred && (
          <button
            type="button"
            onClick={install}
            className="min-h-11 rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Install Mimori
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-full px-4 py-2 text-muted-foreground hover:text-heading"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
