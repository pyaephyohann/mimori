import "server-only";

import { createHash } from "node:crypto";

import { readDestroyOutcome, type ImageDestroyResult } from "./cloudinary-result";
import type { UploadKind } from "./photo-upload";

/**
 * Cloudinary image storage.
 *
 * Uploads are signed on the server: the API secret never leaves this module
 * and nothing here is imported by a client component. No Cloudinary SDK is
 * installed — the REST API is two small signed form posts, so the project does
 * not take a dependency for them.
 */

const API_BASE = "https://api.cloudinary.com/v1_1";

/**
 * Where each kind of upload lands on the Cloudinary account.
 *
 * Finished gallery photos and booth captures are kept apart so the original
 * frames of a photobooth session are distinguishable from published prints in
 * the Cloudinary console, while both still go through the same signed upload.
 */
const UPLOAD_FOLDERS: Record<UploadKind, string> = {
  GALLERY: "mimori/gallery",
  PHOTO_BOOTH: "mimori/photo-booth",
};

export type CloudinaryImage = {
  /** Cloudinary public id, used later for transforms or deletion. */
  publicId: string;
  /** https delivery URL. */
  secureUrl: string;
  width: number | null;
  height: number | null;
  /** Stored size in bytes, when Cloudinary reports it. */
  bytes: number | null;
};

type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function readCredentials(): CloudinaryCredentials | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

/** True when all three Cloudinary variables are set. */
export function isCloudinaryConfigured(): boolean {
  return readCredentials() !== null;
}

function requireCredentials(): CloudinaryCredentials {
  const credentials = readCredentials();

  if (!credentials) {
    throw new Error(
      "Cloudinary is not configured: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set.",
    );
  }

  return credentials;
}

/** Cloudinary's signature: sorted params, concatenated with the secret. */
function sign(params: Record<string, string>, secret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : null;
}

function signedFields(
  credentials: CloudinaryCredentials,
  params: Record<string, string>,
): FormData {
  const form = new FormData();

  for (const [key, value] of Object.entries(params)) {
    form.append(key, value);
  }

  form.append("api_key", credentials.apiKey);
  form.append("signature", sign(params, credentials.apiSecret));

  return form;
}

/**
 * Uploads one image and returns the metadata the database stores.
 *
 * Throws a safe, user-facing error when Cloudinary refuses the upload; the
 * underlying status is logged without the response body, which can echo back
 * request details.
 */
export async function uploadImage(
  file: Blob,
  fileName: string,
  kind: UploadKind = "GALLERY",
): Promise<CloudinaryImage> {
  const credentials = requireCredentials();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const form = signedFields(credentials, {
    folder: UPLOAD_FOLDERS[kind],
    timestamp,
  });

  form.append("file", file, fileName);

  const response = await fetch(
    `${API_BASE}/${credentials.cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    console.error(`Cloudinary upload failed with status ${response.status}.`);

    throw new Error("Cloudinary could not store that photo.");
  }

  const body: unknown = await response.json();
  const publicId = isRecord(body) ? readString(body.public_id) : null;
  const secureUrl = isRecord(body) ? readString(body.secure_url) : null;

  if (!publicId || !secureUrl) {
    console.error("Cloudinary upload response was missing public_id or secure_url.");

    throw new Error("Cloudinary returned an unexpected response.");
  }

  return {
    publicId,
    secureUrl,
    width: isRecord(body) ? readNumber(body.width) : null,
    height: isRecord(body) ? readNumber(body.height) : null,
    bytes: isRecord(body) ? readNumber(body.bytes) : null,
  };
}

/**
 * Destroys one stored asset by its public id and reports what happened.
 *
 * The public id must come from a `Photo` row, never from the client. A missing
 * asset is a success — the goal (it is gone) already holds — while a refused or
 * unreachable destroy is reported as a failure, so a caller can say that the
 * file could not be removed instead of claiming a clean deletion.
 */
export async function destroyImage(
  publicId: string,
): Promise<ImageDestroyResult> {
  try {
    const credentials = requireCredentials();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const form = signedFields(credentials, { public_id: publicId, timestamp });

    const response = await fetch(
      `${API_BASE}/${credentials.cloudName}/image/destroy`,
      { method: "POST", body: form },
    );

    const body: unknown = await response.json().catch(() => null);
    const outcome = readDestroyOutcome(response.status, body);

    if (!outcome.ok) {
      console.error(
        `Cloudinary destroy for ${publicId} failed (${outcome.error}); the asset may be orphaned.`,
      );
    }

    return outcome;
  } catch (error) {
    console.error(`Cloudinary destroy for ${publicId} failed.`, error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

/**
 * Best-effort asset deletion, used when an upload succeeded but its database
 * row could not be written — otherwise the asset would be orphaned.
 *
 * Never throws: cleanup failure is logged and the caller keeps its own error.
 */
export async function deleteImage(publicId: string): Promise<void> {
  await destroyImage(publicId);
}
