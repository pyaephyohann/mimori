/**
 * Saving a photobooth print.
 *
 * A new session stores three things: each capture as a `PHOTO_BOOTH` photo, the
 * finished JPEG as a `PHOTO_BOOTH` photo, then one request that writes the
 * session and points it at those rows.
 *
 * Editing a saved session stores one thing: a replacement print. The captures
 * already exist and are never re-uploaded or replaced, so an edit is a new page
 * over the same photographs.
 *
 * Every successful upload is remembered in the caller's cache, so pressing save
 * again after a failure continues from what is already stored instead of
 * uploading it twice. Only the images that were stored are cached; nothing is
 * claimed as saved until the server confirms it.
 */

import { uploadPhotoFile } from "../gallery-upload-client.ts";
import type { BoothLayout, PhotoCount } from "./catalog.ts";
import type { BoothEditorConfig } from "./editor.ts";
import type { BoothSessionSummary } from "./summary.ts";

export type BoothSaveStage =
  | "preparing"
  | "shot"
  | "print"
  | "session"
  | "saved";

export type BoothSaveProgress = {
  stage: BoothSaveStage;
  /** Steps finished so far, out of `total`. */
  done: number;
  total: number;
  message: string;
};

/** What a save attempt has already stored, kept for retries. */
export type BoothSaveCache = {
  /** Capture id → uploaded `Photo` id. */
  shots: Map<string, string>;
  /** The print's upload, with the settings it was rendered from. */
  print: { signature: string; photoId: string } | null;
};

/**
 * A fresh cache, optionally primed with a session's stored print.
 *
 * Priming is what keeps an unchanged edit from uploading a duplicate: the
 * reopened session's print already matches its settings, so pressing update
 * without changing anything reuses that row instead of making a second copy of
 * the same page.
 */
export function createBoothSaveCache(
  print: { signature: string; photoId: string } | null = null,
): BoothSaveCache {
  return { shots: new Map(), print };
}

export type SavedBooth = {
  sessionId: string;
  print: { id: string; src: string };
  /** The server's description of the session, for the library card. */
  summary: BoothSessionSummary;
};

/** A failure with a message that is safe to show as-is. */
export class BoothSaveError extends Error {}

type BoothSaveInput = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  config: BoothEditorConfig;
  /** Captures in print order. Their Blobs are only read. */
  shots: readonly { id: string; blob: Blob }[];
  /** The rendered JPEG for the current settings. */
  print: Blob;
  cache: BoothSaveCache;
  onProgress?: (progress: BoothSaveProgress) => void;
};

type BoothUpdateInput = {
  /** The session being edited; its captures stay exactly as they are. */
  sessionId: string;
  photoCount: PhotoCount;
  layout: BoothLayout;
  /** Stable ids of the session's captures, in print order. */
  shotIds: readonly string[];
  config: BoothEditorConfig;
  /** The rendered JPEG for the edited settings. */
  print: Blob;
  cache: BoothSaveCache;
  onProgress?: (progress: BoothSaveProgress) => void;
};

type SessionResponse = {
  error?: string;
  session?: BoothSessionSummary;
};

/** A short, unique-enough stamp so Cloudinary names never collide. */
function stamp(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

export type PrintSignatureInput = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  config: BoothEditorConfig;
  /** The captures' ids, in print order. */
  shotIds: readonly string[];
};

/**
 * Everything that decides what the print looks like.
 *
 * The captures are part of it: a retaken photo makes a different print even when
 * every setting is unchanged, so a cached upload is only reused for the exact
 * photos and settings it was rendered from. A reopened session seeds its cache
 * with this same signature, which is why an unedited save reuses its own print.
 */
export function boothPrintSignature(input: PrintSignatureInput): string {
  return JSON.stringify({
    photoCount: input.photoCount,
    layout: input.layout,
    config: input.config,
    shots: input.shotIds,
  });
}

/** The settings both a create and an update send. */
function settingsBody(config: BoothEditorConfig): Record<string, unknown> {
  return {
    borderKey: config.borderKey,
    backgroundKey: config.backgroundKey,
    caption: config.caption,
    showDate: config.showDate,
    printDate: config.showDate ? config.date : null,
    spacing: config.spacing,
    borderWidth: config.borderWidth,
    stickers: config.stickers,
  };
}

function toSavedBooth(session: BoothSessionSummary): SavedBooth {
  return {
    sessionId: session.id,
    print: { id: session.print.id, src: session.print.src },
    summary: session,
  };
}

/**
 * Sends a session write and reads the confirmation.
 *
 * A non-JSON error page (a proxy timeout, a crash) is reported as a failure to
 * reach the store rather than being mistaken for success, and an incomplete
 * confirmation is an error too: the UI never claims a print is saved on a
 * response it could not understand.
 */
async function requestSession(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  fallbackError: string,
): Promise<BoothSessionSummary> {
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
  } catch {
    throw new BoothSaveError(
      "The photobooth could not be reached. Check your connection and try again.",
    );
  }

  let payload: SessionResponse = {};

  try {
    payload = (await response.json()) as SessionResponse;
  } catch {
    // A gateway error page is not JSON; the status check below covers it.
  }

  if (!response.ok) {
    throw new BoothSaveError(payload.error ?? fallbackError);
  }

  const session = payload.session;

  if (
    !session ||
    typeof session.id !== "string" ||
    typeof session.createdAt !== "string" ||
    !session.print?.id ||
    !session.print?.src ||
    typeof session.shotCount !== "number"
  ) {
    throw new BoothSaveError(
      "Your photobooth was saved, but the confirmation could not be read. Check your Photo Booth memories.",
    );
  }

  return session;
}

function uploadError(label: string, error: unknown): BoothSaveError {
  return new BoothSaveError(
    `${label} ${
      error instanceof Error ? error.message : ""
    }`.trim(),
  );
}

/**
 * Saves one new session, reporting honest progress as each step completes.
 *
 * Throws `BoothSaveError` with a message the UI can show directly. The cache is
 * mutated in place so the caller keeps the work already uploaded.
 */
export async function saveBoothSession(
  input: BoothSaveInput,
): Promise<SavedBooth> {
  const { cache, onProgress, shots } = input;
  const report = (progress: BoothSaveProgress) => onProgress?.(progress);

  report({
    stage: "preparing",
    done: 0,
    total: shots.length + 2,
    message: "Preparing your memories…",
  });

  if (shots.length !== input.photoCount) {
    throw new BoothSaveError(
      `This print needs ${input.photoCount} photos, but ${shots.length} are here. Retake the session.`,
    );
  }

  if (shots.some((shot) => !shot.blob || shot.blob.size === 0)) {
    throw new BoothSaveError(
      "One of your photos is missing. Retake it and try again.",
    );
  }

  if (input.print.size === 0) {
    throw new BoothSaveError(
      "Your finished print could not be prepared. Try finishing the print again.",
    );
  }

  const id = stamp();
  const shotPhotoIds: string[] = [];

  for (const [index, shot] of shots.entries()) {
    const cached = cache.shots.get(shot.id);

    if (cached) {
      shotPhotoIds.push(cached);
      continue;
    }

    report({
      stage: "shot",
      done: index,
      total: shots.length + 2,
      message: `Uploading photo ${index + 1} of ${shots.length}…`,
    });

    let uploaded: string;

    try {
      const result = await uploadPhotoFile(
        asFile(shot.blob, `mimori-photo-booth-${id}-${index + 1}.jpg`),
        { kind: "PHOTO_BOOTH" },
      );

      uploaded = result.photoId;
    } catch (error) {
      throw uploadError(`Photo ${index + 1} could not be uploaded.`, error);
    }

    cache.shots.set(shot.id, uploaded);
    shotPhotoIds.push(uploaded);
  }

  const signature = boothPrintSignature({
    photoCount: input.photoCount,
    layout: input.layout,
    config: input.config,
    shotIds: shots.map((shot) => shot.id),
  });
  let printPhotoId: string;

  if (cache.print && cache.print.signature === signature) {
    printPhotoId = cache.print.photoId;
  } else {
    report({
      stage: "print",
      done: shots.length,
      total: shots.length + 2,
      message: "Uploading your finished print…",
    });

    try {
      const result = await uploadPhotoFile(
        asFile(input.print, `mimori-photo-booth-print-${id}.jpg`),
        { kind: "PHOTO_BOOTH" },
      );

      printPhotoId = result.photoId;
    } catch (error) {
      throw uploadError("Your finished print could not be uploaded.", error);
    }

    cache.print = { signature, photoId: printPhotoId };
  }

  report({
    stage: "session",
    done: shots.length + 1,
    total: shots.length + 2,
    message: "Saving your photobooth…",
  });

  const session = await requestSession(
    "/api/photo-booth",
    "POST",
    {
      photoCount: input.photoCount,
      layout: input.layout,
      printPhotoId,
      shotPhotoIds,
      ...settingsBody(input.config),
    },
    "Your photobooth could not be saved. Try again.",
  );

  report({
    stage: "saved",
    done: shots.length + 2,
    total: shots.length + 2,
    message: "Saved to Photo Booth!",
  });

  return toSavedBooth(session);
}

/**
 * Saves an edit to an existing session.
 *
 * Only the print is uploaded; the captures, their order and the print's shape
 * are the session's own and the server keeps them. The new print is confirmed
 * written before anything is reported saved, and the cache holds it so a failed
 * update can be retried without uploading the page again.
 */
export async function updateBoothSession(
  input: BoothUpdateInput,
): Promise<SavedBooth> {
  const { cache, onProgress, config } = input;
  const report = (progress: BoothSaveProgress) => onProgress?.(progress);
  const total = 3;

  report({
    stage: "preparing",
    done: 0,
    total,
    message: "Preparing your changes…",
  });

  if (input.print.size === 0) {
    throw new BoothSaveError(
      "Your finished print could not be prepared. Try finishing the print again.",
    );
  }

  const signature = boothPrintSignature({
    photoCount: input.photoCount,
    layout: input.layout,
    config,
    shotIds: input.shotIds,
  });
  let printPhotoId: string;

  if (cache.print && cache.print.signature === signature) {
    printPhotoId = cache.print.photoId;
  } else {
    report({
      stage: "print",
      done: 0,
      total,
      message: "Uploading your new print…",
    });

    try {
      const result = await uploadPhotoFile(
        asFile(input.print, `mimori-photo-booth-print-${stamp()}.jpg`),
        { kind: "PHOTO_BOOTH" },
      );

      printPhotoId = result.photoId;
    } catch (error) {
      throw uploadError("Your new print could not be uploaded.", error);
    }

    cache.print = { signature, photoId: printPhotoId };
  }

  report({
    stage: "session",
    done: 1,
    total,
    message: "Updating your photobooth…",
  });

  const session = await requestSession(
    `/api/photo-booth/${encodeURIComponent(input.sessionId)}`,
    "PATCH",
    { printPhotoId, ...settingsBody(config) },
    "Your changes could not be saved. Try again.",
  );

  report({
    stage: "saved",
    done: total,
    total,
    message: "Saved to Photo Booth!",
  });

  return toSavedBooth(session);
}
