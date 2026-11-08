/**
 * Turning the live video into a photograph.
 *
 * Capture is a plain `<canvas>` draw — no `ImageCapture`, which Safari does not
 * implement. The frame is limited to about 1080px wide, which is plenty for a
 * photobooth print and keeps six shots comfortable in memory.
 *
 * `captureSize` is pure and unit-tested; the rest needs a browser.
 */

/** Longest side kept when capturing, in pixels. */
export const MAX_CAPTURE_WIDTH = 1080;

/** JPEG quality for a capture; the files are photos, not thumbnails. */
export const CAPTURE_QUALITY = 0.9;

export type CaptureSize = {
  width: number;
  height: number;
};

/**
 * The size a frame is captured at: never upscaled, never wider than the limit,
 * and always at least one pixel.
 */
export function captureSize(
  videoWidth: number,
  videoHeight: number,
  maxWidth = MAX_CAPTURE_WIDTH,
): CaptureSize | null {
  if (
    !Number.isFinite(videoWidth) ||
    !Number.isFinite(videoHeight) ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return null;
  }

  const scale = Math.min(1, maxWidth / videoWidth);

  return {
    width: Math.max(1, Math.round(videoWidth * scale)),
    height: Math.max(1, Math.round(videoHeight * scale)),
  };
}

/**
 * Draws the current frame into a JPEG blob.
 *
 * When `mirrored` is set the canvas is flipped, so a front-camera photo looks
 * exactly like the mirrored preview the person posed in.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  mirrored: boolean,
): Promise<Blob> {
  const size = captureSize(video.videoWidth, video.videoHeight);

  if (!size) {
    throw new Error("The camera is not ready yet.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not prepare the photo.");
  }

  if (mirrored) {
    context.translate(size.width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, size.width, size.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", CAPTURE_QUALITY);
  });

  if (!blob) {
    throw new Error("That photo could not be captured.");
  }

  return blob;
}

/** A captured photograph, kept separate from how a screen presents it. */
export type Capture = {
  /** Stable per-session id, used as a React key and for retakes. */
  id: string;
  blob: Blob;
  /** Object URL for previews; revoked when the capture is discarded. */
  url: string;
  /** True when the frame was flipped to match a mirrored preview. */
  mirrored: boolean;
};

let nextCaptureId = 0;

export function createCapture(blob: Blob, mirrored: boolean): Capture {
  nextCaptureId += 1;

  return {
    id: `booth-capture-${nextCaptureId}`,
    blob,
    url: URL.createObjectURL(blob),
    mirrored,
  };
}

/** Releases a capture's preview URL. Safe to call with null. */
export function releaseCapture(capture: Capture | null | undefined): void {
  if (!capture) {
    return;
  }

  URL.revokeObjectURL(capture.url);
}
