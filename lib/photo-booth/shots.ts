/**
 * One photograph inside a booth print, whichever visit it came from.
 *
 * A new session's photos are camera captures: a `Blob` plus one object URL.
 * A reopened session's photos are Cloudinary images that already have a `Photo`
 * row, so they have a URL and an id but no Blob — re-uploading them would only
 * duplicate what the database already holds.
 *
 * The editor, the preview and the canvas renderer all take this union, so the
 * two sources behave identically: a preview URL to draw, and something the
 * renderer can turn into an image. `source` is what keeps the distinction
 * honest — an object URL is revoked when its capture goes away, a saved URL
 * never is.
 */

import type { Capture } from "./capture.ts";

/** Prefix of a restored shot's local id, so it is recognisable in state. */
export const SAVED_SHOT_PREFIX = "saved-shot-";

export type BoothShot =
  | {
      source: "capture";
      /** The capture's id, used as a React key and in the save cache. */
      id: string;
      /** Object URL; released with the capture. */
      url: string;
      blob: Blob;
    }
  | {
      source: "saved";
      /** `saved-shot-<photoId>`, stable across every visit. */
      id: string;
      /** Cloudinary delivery URL. */
      url: string;
      photoId: string;
    };

/** A camera capture, as the editor sees it. */
export function captureShot(capture: Capture): BoothShot {
  return {
    source: "capture",
    id: capture.id,
    url: capture.url,
    blob: capture.blob,
  };
}

/** A photograph restored from a saved session. */
export function savedShot(photo: { id: string; src: string }): BoothShot {
  return {
    source: "saved",
    id: `${SAVED_SHOT_PREFIX}${photo.id}`,
    url: photo.src,
    photoId: photo.id,
  };
}

/**
 * What the canvas renderer draws for a shot: a Blob it can turn into an object
 * URL, or a Cloudinary URL it loads directly. Both are read, never modified.
 */
export function shotPhotoSource(shot: BoothShot): Blob | string {
  return shot.source === "capture" ? shot.blob : shot.url;
}
