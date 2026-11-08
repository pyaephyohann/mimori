"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BowSticker } from "@/components/scrapbook/doodles";
import {
  DEFAULT_BOOTH_LAYOUT,
  DEFAULT_PHOTO_COUNT,
  type BoothLayout,
  type PhotoCount,
} from "@/lib/photo-booth/catalog";
import {
  DEFAULT_BORDER_KEY,
  type BorderKey,
} from "@/lib/photo-booth/borders";
import type { FacingMode } from "@/lib/photo-booth/camera";
import { releaseCapture, type Capture } from "@/lib/photo-booth/capture";
import {
  INITIAL_EDITOR_CONFIG,
  createBoothEditorConfig,
  type BoothEditorConfig,
} from "@/lib/photo-booth/editor";
import type { RestoredBooth } from "@/lib/photo-booth/restore";
import type { SavedBooth } from "@/lib/photo-booth/save";
import { captureShot, type BoothShot } from "@/lib/photo-booth/shots";
import {
  mergeSessionSummary,
  type BoothSessionSummary,
} from "@/lib/photo-booth/summary";

import { CameraStep } from "./camera-step";
import { EditorStep } from "./editor-step";
import { ReviewStep } from "./review-step";
import { SavedSessions } from "./saved-sessions";
import { SetupDialog } from "./setup-dialog";

type Step = "setup" | "camera" | "review" | "editor";

/** The navbar's "+ New Photo Booth" action lands here to open the sheet. */
const SETUP_HASH = "#photo-booth-setup";

type SessionsState = {
  status: "loading" | "ready" | "error";
  items: BoothSessionSummary[];
  error: string | null;
};

const LOAD_ERROR = "Your saved booths could not be loaded right now.";

function emptySlots(count: PhotoCount): (Capture | null)[] {
  return Array.from({ length: count }, () => null);
}

function allSlots(count: PhotoCount): number[] {
  return Array.from({ length: count }, (_unused, index) => index);
}

/**
 * The photobooth session.
 *
 * Setup choices, the captured photos and the current step all live here, so the
 * camera only has to report what it shot and the review only has to ask for a
 * retake. The photos are held in memory — Blobs plus one object URL each — and
 * every URL is revoked when its shot is replaced, discarded or the page goes
 * away.
 *
 * The same component runs a reopened booth. `reopened` holds a saved session's
 * photos as Cloudinary URLs, so the editor works on them exactly as it works on
 * fresh captures and no camera or upload is needed to get back to editing.
 * `session` is the row an edit belongs to: once a print has been saved, its
 * next save updates that session instead of creating another one.
 */
export function PhotoBooth({
  initialBooth = null,
}: {
  /** A saved session already restored for the detail route; opens the editor straight away. */
  initialBooth?: RestoredBooth | null;
} = {}) {
  const prefersReducedMotion = useReducedMotion();

  const [photoCount, setPhotoCount] = useState<PhotoCount>(
    initialBooth?.photoCount ?? DEFAULT_PHOTO_COUNT,
  );
  const [layout, setLayout] = useState<BoothLayout>(
    initialBooth?.layout ?? DEFAULT_BOOTH_LAYOUT,
  );
  const [borderKey, setBorderKey] = useState<BorderKey>(
    initialBooth?.config.borderKey ?? DEFAULT_BORDER_KEY,
  );
  const [facingMode, setFacingMode] = useState<FacingMode>("user");

  const [step, setStep] = useState<Step>(initialBooth ? "editor" : "setup");
  // The setup choices live in a sheet, exactly like the Add Widgets dialog;
  // the main page keeps them out of the way until a new booth is asked for.
  const [setupOpen, setSetupOpen] = useState(false);
  const [shots, setShots] = useState<(Capture | null)[]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [editor, setEditor] = useState<BoothEditorConfig>(
    initialBooth?.config ?? INITIAL_EDITOR_CONFIG,
  );
  // The saved session this visit is editing; null until the print is stored.
  const [session, setSession] = useState<SavedBooth | null>(
    initialBooth
      ? {
          sessionId: initialBooth.sessionId,
          print: initialBooth.print,
          summary: initialBooth.summary,
        }
      : null,
  );
  // A reopened session's photos, as saved image URLs; null for a new session.
  const [reopened, setReopened] = useState<BoothShot[] | null>(
    initialBooth?.shots ?? null,
  );

  const [sessions, setSessions] = useState<SessionsState>({
    status: "loading",
    items: [],
    error: null,
  });
  const [sessionsToken, setSessionsToken] = useState(0);

  const shotsRef = useRef(shots);

  useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);

  const releaseAll = useCallback(() => {
    shotsRef.current.forEach((shot) => releaseCapture(shot));
  }, []);

  // Object URLs are page-lifetime resources; release them even if the visitor
  // navigates away mid-session.
  useEffect(() => {
    return () => {
      shotsRef.current.forEach((shot) => releaseCapture(shot));
    };
  }, []);

  // The saved sessions are fetched once, and again only when a save, an update
  // or an explicit retry changes the list.
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/photo-booth", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          throw new Error(body?.error ?? LOAD_ERROR);
        }

        const data = (await response.json()) as { sessions?: BoothSessionSummary[] };

        return Array.isArray(data.sessions) ? data.sessions : [];
      })
      .then((items) => {
        setSessions({ status: "ready", items, error: null });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSessions((current) => ({
          status: "error",
          items: current.items,
          error:
            cause instanceof Error && cause.message ? cause.message : LOAD_ERROR,
        }));
      });

    return () => controller.abort();
  }, [sessionsToken]);

  const retrySessions = useCallback(() => {
    setSessions((current) => ({ ...current, status: "loading", error: null }));
    setSessionsToken((token) => token + 1);
  }, []);

  /**
   * Opens the setup sheet for a brand-new booth.
   *
   * Every opening starts from the documented defaults, the same way the Add
   * Widgets dialog remounts with a blank draft, so a new booth never inherits
   * choices left over from a previous visit ([ISSUE-020]).
   */
  const openNewSetup = useCallback(() => {
    setPhotoCount(DEFAULT_PHOTO_COUNT);
    setLayout(DEFAULT_BOOTH_LAYOUT);
    setBorderKey(DEFAULT_BORDER_KEY);
    setSetupOpen(true);
  }, []);

  /** Dismisses the sheet without touching the camera or any saved session. */
  const closeSetup = useCallback(() => {
    setSetupOpen(false);

    // Drop the setup anchor so the navbar action can open the sheet again.
    if (window.location.hash === SETUP_HASH) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  // "+ New Photo Booth" in the navbar is a link to the setup anchor. A link on
  // the current page changes the hash through the router rather than a plain
  // hash navigation, so the click is handled directly as well as on load.
  useEffect(() => {
    if (step !== "setup") {
      return;
    }

    const openFromHash = () => {
      if (window.location.hash === SETUP_HASH) {
        openNewSetup();
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest(`a[href$="${SETUP_HASH}"]`)) {
        openNewSetup();
      }
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", onClick);
    };
  }, [step, openNewSetup]);

  const startSession = () => {
    releaseAll();
    setSession(null);
    setReopened(null);
    setShots(emptySlots(photoCount));
    setTargets(allSlots(photoCount));
    // A new session starts with the border chosen in setup and a clean page.
    setEditor(createBoothEditorConfig(borderKey));
    closeSetup();
    setStep("camera");
  };

  const handleCapture = useCallback((index: number, capture: Capture) => {
    // A retaken photo is no longer the one the saved print was made from.
    setSession(null);

    setShots((current) => {
      const next = [...current];
      // A retake replaces its slot; the old object URL is no longer needed.
      releaseCapture(next[index]);
      next[index] = capture;
      return next;
    });
  }, []);

  const handleComplete = useCallback(() => {
    setStep("review");
  }, []);

  const retakeOne = (index: number) => {
    // The previous photo stays in its slot until the new one replaces it, so
    // leaving the camera early cannot lose the session.
    setTargets([index]);
    setStep("camera");
  };

  const retakeAll = () => {
    releaseAll();
    setSession(null);
    setShots(emptySlots(photoCount));
    setTargets(allSlots(photoCount));
    setStep("camera");
  };

  const backToSetup = () => {
    releaseAll();
    setSession(null);
    setReopened(null);
    setShots([]);
    setTargets([]);
    setStep("setup");
    // Coming back from a half-taken booth reopens the sheet with the choices
    // that booth was started with, so they can be adjusted and started again.
    setSetupOpen(true);
  };

  const exitCamera = () => {
    // A retake pass only changes one slot, so leaving it returns to the photos
    // that are still there. A fresh session is abandoned instead.
    if (targets.length < photoCount) {
      setStep("review");
      return;
    }

    backToSetup();
  };

  const handleSaved = useCallback((saved: SavedBooth) => {
    setSession(saved);
    // The library learns about the save or update without another request.
    setSessions((current) => ({
      status: "ready",
      items: mergeSessionSummary(current.items, saved.summary),
      error: null,
    }));
  }, []);

  const router = useRouter();

  const backFromEditor = () => {
    if (reopened) {
      // A reopened booth has no review step: its photos were taken in a
      // previous visit, so leaving the editor returns to the library page.
      router.push("/photo-booth");
      return;
    }

    setStep("review");
  };

  /**
   * Leaves the editor for the library, where the saved booth is listed.
   *
   * A reopened booth lives on its own route, so leaving it is a navigation. A
   * fresh booth is already on the library page, so returning to the setup step
   * shows that list — with this save or update already merged into it.
   */
  const goToBoothLibrary = () => {
    if (reopened) {
      router.push("/photo-booth");
      return;
    }

    // The navbar's setup link may have left the setup anchor in the URL while
    // the editor was open; closing the sheet clears it, so the library opens
    // without the new booth sheet reappearing.
    closeSetup();
    setStep("setup");
  };

  const reviewShots = shots.filter((shot): shot is Capture => shot !== null);
  const editorShots: BoothShot[] = reopened ?? reviewShots.map(captureShot);

  return (
    <motion.div
      key={step}
      id="photo-booth-setup"
      className="scroll-mt-24"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: "easeOut",
      }}
    >
      {step === "setup" ? (
        <>
          <SavedSessions
            sessions={sessions.items}
            status={sessions.status}
            error={sessions.error}
            onRetry={retrySessions}
          />

          <section
            aria-labelledby="new-booth-heading"
            className="mt-5 rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:mt-6 sm:p-5"
          >
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
                  A fresh page
                </p>
                <h2
                  id="new-booth-heading"
                  className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
                >
                  Start a new booth
                  <BowSticker className="text-base" />
                </h2>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-paper-foreground/65">
                  Choose how many photos, which shape and which border — the
                  camera takes it from there.
                </p>
              </div>

              <button
                type="button"
                onClick={openNewSetup}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                + New Photobooth
              </button>
            </div>
          </section>

          <AnimatePresence>
            {setupOpen ? (
              <SetupDialog
                photoCount={photoCount}
                layout={layout}
                borderKey={borderKey}
                onPhotoCountChange={setPhotoCount}
                onLayoutChange={setLayout}
                onBorderChange={setBorderKey}
                onStart={startSession}
                onClose={closeSetup}
              />
            ) : null}
          </AnimatePresence>
        </>
      ) : null}

      {step === "camera" ? (
        <CameraStep
          key={`camera-${targets.join("-")}`}
          photoCount={photoCount}
          layout={layout}
          shots={shots}
          targets={targets}
          facingMode={facingMode}
          onFacingChange={setFacingMode}
          onCapture={handleCapture}
          onComplete={handleComplete}
          onExit={exitCamera}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          shots={reviewShots}
          photoCount={photoCount}
          layout={layout}
          borderKey={editor.borderKey}
          onRetake={retakeOne}
          onRetakeAll={retakeAll}
          onBackToSetup={backToSetup}
          onEdit={() => setStep("editor")}
        />
      ) : null}

      {step === "editor" ? (
        <EditorStep
          photoCount={photoCount}
          layout={layout}
          photos={editorShots}
          config={editor}
          onChange={setEditor}
          onBack={backFromEditor}
          backLabel={reopened ? "Back to Photobooths" : "Back to review"}
          session={session}
          onSaved={handleSaved}
          onGoToBooth={goToBoothLibrary}
        />
      ) : null}
    </motion.div>
  );
}
