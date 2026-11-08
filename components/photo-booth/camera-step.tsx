"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { CameraIcon } from "@/components/nav/nav-icons";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import type { BoothLayout, PhotoCount } from "@/lib/photo-booth/catalog";
import {
  activeFacing,
  cameraConstraints,
  cameraFailure,
  describeCameraError,
  isCameraApiAvailable,
  setTorch,
  stopStream,
  trackSupportsTorch,
  waitForVideo,
  type CameraFailure,
  type FacingMode,
} from "@/lib/photo-booth/camera";
import {
  captureFrame,
  createCapture,
  type Capture,
} from "@/lib/photo-booth/capture";

import { CaptureStrip } from "./capture-strip";
import { CountdownOverlay, useCountdown } from "./countdown";

/** How long a finished shot stays on screen before the next countdown. */
const CONFIRMATION_MS = 900;

type CameraStatus = "starting" | "ready" | "error";

type CameraStepProps = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  /** The whole session's slots, so filled ones stay visible during a retake. */
  shots: readonly (Capture | null)[];
  /** Slots this camera pass should fill, in order. */
  targets: readonly number[];
  facingMode: FacingMode;
  onFacingChange: (mode: FacingMode) => void;
  onCapture: (index: number, capture: Capture) => void;
  onComplete: () => void;
  onExit: () => void;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * The camera screen.
 *
 * The stream lifecycle is deliberately all here in one place: request → wait
 * for real video dimensions → count down → draw a frame → next. A generation
 * counter invalidates an old sequence whenever the camera is switched, retried
 * or left, so a stale loop can never capture or write after teardown, and every
 * track is stopped when the screen goes away.
 *
 * The parent owns the captures and the setup choices; this component only
 * reports each photograph and when its pass is done.
 */
export function CameraStep({
  photoCount,
  layout,
  shots,
  targets,
  facingMode,
  onFacingChange,
  onCapture,
  onComplete,
  onExit,
}: CameraStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const headingId = useId();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const generationRef = useRef(0);
  const positionRef = useRef(0);
  const skipRef = useRef(false);
  const switchingRef = useRef(false);
  const activeRef = useRef<FacingMode>(facingMode);
  const flashTimerRef = useRef<number | null>(null);

  // Which slots this camera pass has already shot. Kept separate from the
  // session's photos so a retake of a filled slot still captures.
  const capturedThisPassRef = useRef<Set<number>>(new Set());
  // The generation of the pass currently running, or 0 when the camera is
  // idle. The shutter uses it so a press between two shots cannot start a
  // second loop over the same slots.
  const passRef = useRef(0);
  const targetsRef = useRef(targets);
  const photoCountRef = useRef(photoCount);
  const onCaptureRef = useRef(onCapture);
  const onCompleteRef = useRef(onComplete);

  // The async camera pass reads the latest props through refs, so a parent
  // re-render never restarts the stream just because a callback is new.
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    photoCountRef.current = photoCount;
  }, [photoCount]);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [status, setStatus] = useState<CameraStatus>("starting");
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [activeFacingMode, setActiveFacingMode] =
    useState<FacingMode>(facingMode);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [position, setPosition] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const {
    value: countdownValue,
    running: countdownRunning,
    start: startCountdown,
    cancel: cancelCountdown,
  } = useCountdown();

  const filled = shots.filter((shot) => shot !== null).length;
  const activeTarget = targets[position] ?? null;
  const mirrored = activeFacingMode === "user";
  const retakePass = targets.length < photoCount;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  const openStream = useCallback(async (mode: FacingMode): Promise<boolean> => {
    if (!isCameraApiAvailable()) {
      setFailure(cameraFailure("unsupported"));
      setStatus("error");
      return false;
    }

    if (!window.isSecureContext) {
      setFailure(cameraFailure("insecure"));
      setStatus("error");
      return false;
    }

    const request = requestRef.current + 1;
    requestRef.current = request;

    const previous = streamRef.current;
    streamRef.current = null;
    stopStream(previous);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        cameraConstraints(mode),
      );

      if (!mountedRef.current || request !== requestRef.current) {
        stopStream(stream);
        return false;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (video) {
        video.srcObject = stream;
        const ready = await waitForVideo(video);

        if (!ready || !mountedRef.current || request !== requestRef.current) {
          stopStream(stream);

          if (streamRef.current === stream) {
            streamRef.current = null;
          }

          if (mountedRef.current && request === requestRef.current) {
            setFailure(cameraFailure("unknown"));
            setStatus("error");
          }

          return false;
        }
      }

      const actual = activeFacing(stream, mode);
      const track = stream.getVideoTracks()[0] ?? null;

      activeRef.current = actual;
      setActiveFacingMode(actual);
      setTorchAvailable(trackSupportsTorch(track));
      setStatus("ready");

      return true;
    } catch (error) {
      if (!mountedRef.current || request !== requestRef.current) {
        return false;
      }

      setFailure(describeCameraError(error));
      setStatus("error");

      return false;
    }
  }, []);

  const captureNow = useCallback(async (): Promise<Capture | null> => {
    const video = videoRef.current;

    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setNotice("The camera is still warming up. Try the shutter again.");
      return null;
    }

    setCapturing(true);
    setNotice(null);

    try {
      const blob = await captureFrame(video, activeRef.current === "user");

      return createCapture(blob, activeRef.current === "user");
    } catch {
      setNotice("That photo didn't save. Tap the shutter to try again.");
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  /**
   * Runs one camera pass over the given targets.
   *
   * A generation bump invalidates any previous pass, so a switch or retry can
   * abandon a countdown without leaving a second loop that also fires.
   */
  const runSequence = useCallback(
    async (from: number) => {
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      passRef.current = generation;

      try {
        let index = from;

        while (index < targetsRef.current.length) {
          if (!mountedRef.current || generation !== generationRef.current) {
            return;
          }

          const target = targetsRef.current[index];

          if (capturedThisPassRef.current.has(target)) {
            index += 1;
            continue;
          }

          positionRef.current = index;
          setPosition(index);
          skipRef.current = false;

          const completed = await startCountdown();

          if (!mountedRef.current || generation !== generationRef.current) {
            return;
          }

          // A switch, exit or unmount cancels silently; the shutter sets the
          // skip flag to mean "take it right now instead".
          if (!completed && !skipRef.current) {
            return;
          }

          skipRef.current = false;

          if (capturedThisPassRef.current.has(target)) {
            index += 1;
            continue;
          }

          const capture = await captureNow();

          if (!mountedRef.current || generation !== generationRef.current) {
            return;
          }

          if (!capture) {
            return;
          }

          capturedThisPassRef.current.add(target);
          onCaptureRef.current(target, capture);
          setAnnouncement(
            `Photo ${target + 1} of ${photoCountRef.current} captured.`,
          );

          setFlashing(true);

          if (flashTimerRef.current !== null) {
            window.clearTimeout(flashTimerRef.current);
          }

          flashTimerRef.current = window.setTimeout(
            () => setFlashing(false),
            prefersReducedMotion ? 120 : 300,
          );

          positionRef.current = index + 1;

          await wait(prefersReducedMotion ? 400 : CONFIRMATION_MS);

          if (!mountedRef.current || generation !== generationRef.current) {
            return;
          }

          index += 1;
        }

        if (mountedRef.current && generation === generationRef.current) {
          onCompleteRef.current();
        }
      } finally {
        // A pass that a switch or retry superseded leaves the flag to its
        // successor, which has already claimed it.
        if (passRef.current === generation) {
          passRef.current = 0;
        }
      }
    },
    [captureNow, prefersReducedMotion, startCountdown],
  );

  /** Opens the camera and begins with the first slot still empty. */
  const startCamera = useCallback(
    async (mode: FacingMode) => {
      const ok = await openStream(mode);

      if (!ok || !mountedRef.current) {
        return;
      }

      const next = targetsRef.current.findIndex(
        (target) => !capturedThisPassRef.current.has(target),
      );

      if (next < 0) {
        onCompleteRef.current();
        return;
      }

      void runSequence(next);
    },
    [openStream, runSequence],
  );

  // One pass per mounted camera. Changing the facing mode tears everything
  // down first, so no track survives a switch.
  useEffect(() => {
    // Deferred by a tick so the request starts outside the effect body; the
    // opening state is already the initial one.
    const startTimer = window.setTimeout(() => {
      void startCamera(facingMode);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      generationRef.current += 1;
      cancelCountdown();
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [facingMode, startCamera, cancelCountdown]);

  // The switch has landed once the new stream is usable again.
  useEffect(() => {
    if (status === "ready") {
      switchingRef.current = false;
    }
  }, [status]);

  const retry = useCallback(() => {
    generationRef.current += 1;
    cancelCountdown();
    setFailure(null);
    setNotice(null);
    setTorchAvailable(false);
    setTorchOn(false);
    setStatus("starting");
    void startCamera(facingMode);
  }, [cancelCountdown, facingMode, startCamera]);

  const switchCamera = useCallback(() => {
    if (status !== "ready" || switchingRef.current) {
      return;
    }

    switchingRef.current = true;
    generationRef.current += 1;
    cancelCountdown();
    setFailure(null);
    setNotice(null);
    setTorchAvailable(false);
    setTorchOn(false);
    setStatus("starting");
    onFacingChange(activeFacingMode === "user" ? "environment" : "user");
  }, [activeFacingMode, cancelCountdown, onFacingChange, status]);

  const shutter = useCallback(() => {
    if (status !== "ready" || capturing) {
      return;
    }

    if (countdownRunning) {
      skipRef.current = true;
      cancelCountdown();
      return;
    }

    // Between two shots the countdown is not running, but the pass still is.
    // Pressing here would start a second pass over the same slots, so it waits
    // for the next countdown instead.
    if (passRef.current !== 0) {
      return;
    }

    void runSequence(positionRef.current);
  }, [cancelCountdown, capturing, countdownRunning, runSequence, status]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0] ?? null;
    const next = !torchOn;
    const applied = await setTorch(track, next);

    if (applied) {
      setTorchOn(next);
    }
  }, [torchOn]);

  const exit = useCallback(() => {
    generationRef.current += 1;
    cancelCountdown();
    stopStream(streamRef.current);
    streamRef.current = null;
    onExit();
  }, [cancelCountdown, onExit]);

  return (
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <section
        aria-labelledby={headingId}
        className="rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
              Step two · Camera
            </p>
            <h2
              id={headingId}
              className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
            >
              Say cheese
              <BowSticker className="text-sm" />
            </h2>
            <p className="mt-1 max-w-md text-xs text-paper-foreground/65">
              The countdown runs on its own. Tap the shutter to take the next
              one sooner.
            </p>
          </div>

          <p className="rounded-full bg-blush-pink px-3 py-1 text-[11px] font-medium text-paper-foreground">
            {filled} / {photoCount} photos captured
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] lg:items-center">
          <div className="relative overflow-hidden rounded-2xl bg-warm-charcoal">
            <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Live camera preview"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
              />

              {status === "starting" ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-paper/90 text-center">
                  <BowSticker className="scrapbook-sway text-2xl" />
                  <p className="font-decorative text-xl text-paper-foreground">
                    Opening the camera…
                  </p>
                  <p className="text-[11px] text-paper-foreground/60">
                    Allow access if your browser asks.
                  </p>
                </div>
              ) : null}

              {status === "error" && failure ? (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-paper/95 px-5 text-center">
                  <HeartDoodle className="h-6 w-6 text-dusty-rose" />
                  <p className="font-decorative text-xl leading-tight text-paper-foreground">
                    {failure.title}
                  </p>
                  <p className="max-w-xs text-[11px] leading-relaxed text-paper-foreground/70">
                    {failure.message}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {failure.canRetry ? (
                      <button
                        type="button"
                        onClick={retry}
                        className="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                      >
                        Try again
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={exit}
                      className="cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
                    >
                      Back to setup
                    </button>
                  </div>
                </div>
              ) : null}

              {status === "ready" && activeTarget !== null ? (
                <p className="absolute top-2 left-2 z-10 rounded-full bg-paper/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-paper-foreground">
                  Photo {activeTarget + 1} of {photoCount}
                </p>
              ) : null}

              {countdownRunning ? (
                <CountdownOverlay value={countdownValue} />
              ) : null}

              {capturing ? (
                <p
                  aria-live="polite"
                  className="absolute inset-x-0 bottom-3 z-20 text-center font-decorative text-xl text-white drop-shadow"
                >
                  📸 Smile!
                </p>
              ) : null}

              <AnimatePresence>
                {flashing ? (
                  <motion.div
                    key="flash"
                    aria-hidden="true"
                    initial={{ opacity: prefersReducedMotion ? 0.7 : 0 }}
                    animate={{ opacity: 0.75 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.18,
                    }}
                    className="pointer-events-none absolute inset-0 z-30 bg-white"
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={shutter}
              disabled={status !== "ready" || capturing}
              aria-label="Take a photo now"
              className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-primary text-primary-foreground shadow-[0_14px_34px_-18px_rgba(73,52,61,0.9)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CameraIcon className="h-8 w-8" />
            </button>
            <p className="text-[10px] tracking-[0.18em] text-paper-foreground/50 uppercase">
              Shutter
            </p>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={switchCamera}
                disabled={status !== "ready"}
                className="cursor-pointer rounded-full border border-paper-edge px-3 py-1.5 text-[11px] font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeFacingMode === "user"
                  ? "Use rear camera"
                  : "Use front camera"}
              </button>

              {torchAvailable ? (
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  aria-pressed={torchOn}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    torchOn
                      ? "border-primary bg-blush-pink text-deep-candy-pink"
                      : "border-paper-edge text-paper-foreground hover:bg-blush-pink/60"
                  }`}
                >
                  Torch {torchOn ? "on" : "off"}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={exit}
              className="cursor-pointer rounded-full px-3 py-1.5 text-[11px] text-paper-foreground/60 underline-offset-2 transition-colors hover:text-paper-foreground hover:underline"
            >
              {retakePass ? "Back to review" : "Exit the camera"}
            </button>
          </div>
        </div>

        {notice ? (
          <p
            role="status"
            className="mt-3 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-center text-[11px] text-danger"
          >
            {notice}
          </p>
        ) : null}

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <div className="mt-4 border-t border-paper-edge pt-4">
          <CaptureStrip
            shots={shots}
            activeTarget={status === "ready" ? activeTarget : null}
            layout={layout}
          />
        </div>
      </section>
    </div>
  );
}
