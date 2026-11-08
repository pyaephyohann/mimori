/**
 * Camera plumbing for the photobooth.
 *
 * All of it is plain browser API work — `getUserMedia`, track capabilities and
 * stream teardown — kept out of the components so the camera's lifecycle and
 * its error copy are in one place. No camera library is involved.
 *
 * The error mapping and the constraint builder are pure and covered by
 * `node:test`; the stream helpers need a browser.
 */

export type FacingMode = "user" | "environment";

export type CameraErrorKind =
  | "denied"
  | "missing"
  | "busy"
  | "overconstrained"
  | "insecure"
  | "unsupported"
  | "unknown";

export type CameraFailure = {
  kind: CameraErrorKind;
  title: string;
  message: string;
  /** False when retrying cannot help, such as an insecure origin. */
  canRetry: boolean;
};

const FAILURES: Record<CameraErrorKind, Omit<CameraFailure, "kind">> = {
  denied: {
    title: "Camera access is blocked",
    message:
      "Allow camera access for Mimori in your browser, then try again.",
    canRetry: true,
  },
  missing: {
    title: "No camera found",
    message: "This device doesn't seem to have a camera available.",
    canRetry: true,
  },
  busy: {
    title: "The camera is busy",
    message:
      "Another app might be using it. Close that app and give it another try.",
    canRetry: true,
  },
  overconstrained: {
    title: "That camera isn't available",
    message:
      "This device can't open the requested camera. Try switching between the front and rear camera.",
    canRetry: true,
  },
  insecure: {
    title: "The camera needs a secure connection",
    message:
      "Camera access works over HTTPS or on localhost. Open Mimori there and try again.",
    canRetry: false,
  },
  unsupported: {
    title: "This browser can't use the camera",
    message: "Try a recent version of Safari, Chrome or Firefox.",
    canRetry: false,
  },
  unknown: {
    title: "The camera could not start",
    message: "Give it another try, or reload the page if it keeps happening.",
    canRetry: true,
  },
};

export function cameraFailure(kind: CameraErrorKind): CameraFailure {
  return { kind, ...FAILURES[kind] };
}

/** Maps a rejected `getUserMedia` promise onto friendly, actionable copy. */
export function describeCameraError(error: unknown): CameraFailure {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return cameraFailure("denied");
    case "NotFoundError":
    case "DevicesNotFoundError":
      return cameraFailure("missing");
    case "NotReadableError":
    case "TrackStartError":
      return cameraFailure("busy");
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return cameraFailure("overconstrained");
    case "SecurityError":
      return cameraFailure("insecure");
    default:
      return cameraFailure("unknown");
  }
}

/** True when this browser exposes a camera API at all. */
export function isCameraApiAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/**
 * Requests a 4:3 stream at a sensible size, preferring the requested side.
 *
 * `ideal` rather than `exact` means a device with only one camera still opens
 * it instead of rejecting the request.
 */
export function cameraConstraints(facing: FacingMode): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
  };
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // A track that is already ended throws in some browsers; nothing to do.
    }
  }
}

/** The side the stream actually opened, which may differ from the request. */
export function activeFacing(
  stream: MediaStream,
  fallback: FacingMode,
): FacingMode {
  const facing = stream.getVideoTracks()[0]?.getSettings?.().facingMode;

  return facing === "user" || facing === "environment" ? facing : fallback;
}

type TorchCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
};

/** Torch is a rear-camera Chromium feature; most devices do not expose it. */
export function trackSupportsTorch(track: MediaStreamTrack | null): boolean {
  if (!track || typeof track.getCapabilities !== "function") {
    return false;
  }

  const capabilities = track.getCapabilities() as TorchCapabilities;

  return capabilities?.torch === true;
}

/** Turns the torch on or off; resolves false when the device refuses. */
export async function setTorch(
  track: MediaStreamTrack | null,
  enabled: boolean,
): Promise<boolean> {
  if (!track) {
    return false;
  }

  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled } as unknown as MediaTrackConstraintSet],
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Waits until the video has real dimensions, so a capture can never be an
 * empty black frame. Resolves false on a stream error or after the timeout.
 */
export function waitForVideo(
  video: HTMLVideoElement,
  timeoutMs = 8000,
): Promise<boolean> {
  if (video.readyState >= 2 && video.videoWidth > 0) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("playing", check);
      video.removeEventListener("error", onError);
    };

    const finish = (ready: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(ready);
    };

    const check = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        finish(true);
      }
    };

    const onError = () => finish(false);
    const timer = window.setTimeout(
      () => finish(video.readyState >= 2 && video.videoWidth > 0),
      timeoutMs,
    );

    video.addEventListener("loadedmetadata", check);
    video.addEventListener("playing", check);
    video.addEventListener("error", onError);

    void video.play().catch(() => {
      // Autoplay may need the muted attribute, which the element already has;
      // a rejected play() is not fatal while metadata is still loading.
    });

    check();
  });
}
