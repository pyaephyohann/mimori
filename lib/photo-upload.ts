/**
 * Upload rules shared by the gallery's upload button and the upload Route
 * Handler.
 *
 * The client uses these to reject a file before it is sent; the server applies
 * them again and treats the file's own bytes as the source of truth, because
 * `File.type` is supplied by the browser and can be wrong or spoofed.
 */

/**
 * The kinds of photo the upload endpoint may store.
 *
 * Gallery uploads and Photo Booth captures share one endpoint, one validator
 * and one Cloudinary client; the kind decides only which `PhotoKind` the row is
 * written with and which Cloudinary folder holds the file. The list is closed:
 * a client cannot ask for any other kind.
 */
export const UPLOAD_KINDS = ["GALLERY", "PHOTO_BOOTH"] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const DEFAULT_UPLOAD_KIND: UploadKind = "GALLERY";

/**
 * Reads the requested kind from a form value.
 *
 * Omitted, empty and null all mean the gallery, so every existing upload that
 * never sends a kind keeps behaving exactly as before. A value that is present
 * but not on the allowlist returns null, which the route rejects.
 */
export function normalizeUploadKind(value: unknown): UploadKind | null {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_UPLOAD_KIND;
  }

  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim().toUpperCase();

  return (UPLOAD_KINDS as readonly string[]).includes(candidate)
    ? (candidate as UploadKind)
    : null;
}

/** Cloudinary's own per-image limit for the free plan, and plenty for a memory. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** One batch in the gallery upload dialog. */
export const MAX_UPLOAD_FILES = 10;

export const UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

const MIME_LABELS: Record<UploadMimeType, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
};

/** Human-readable list, e.g. "JPEG, PNG, WebP or AVIF". */
export const UPLOAD_FORMAT_LABEL = UPLOAD_MIME_TYPES.map(
  (mime) => MIME_LABELS[mime],
).join(", ");

/** Normalises a declared MIME type; `null` when it is not an accepted image. */
export function normalizeUploadMime(
  value: string | null | undefined,
): UploadMimeType | null {
  if (!value) {
    return null;
  }

  const bare = value.split(";")[0]?.trim().toLowerCase() ?? "";

  // Some browsers still report the old `image/jpg` alias.
  const candidate = bare === "image/jpg" ? "image/jpeg" : bare;

  return (UPLOAD_MIME_TYPES as readonly string[]).includes(candidate)
    ? (candidate as UploadMimeType)
    : null;
}

/** A message for an unusable file, or `null` when its size is acceptable. */
export function uploadSizeError(size: number): string | null {
  if (!Number.isFinite(size) || size <= 0) {
    return "That file is empty.";
  }

  if (size > MAX_UPLOAD_BYTES) {
    const megabytes = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

    return `That photo is larger than ${megabytes} MB.`;
  }

  return null;
}

/**
 * Reads the image format from the file's leading bytes.
 *
 * The server stores whatever this returns, never the declared type, so a
 * renamed file cannot claim to be an image it is not.
 */
export function sniffImageMime(bytes: Uint8Array): UploadMimeType | null {
  const matches = (offset: number, signature: readonly number[]) =>
    signature.every((value, index) => bytes[offset + index] === value);

  if (matches(0, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (matches(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (matches(0, [0x52, 0x49, 0x46, 0x46]) && matches(8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }

  if (matches(4, [0x66, 0x74, 0x79, 0x70])) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));

    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
  }

  return null;
}

/** Longest title a photo can be given at upload time. */
export const MAX_PHOTO_TITLE_LENGTH = 80;

/**
 * Reads an optional per-photo title from a form value.
 *
 * Omitted, non-text, empty or whitespace-only all mean no title (`null`), so the
 * photo keeps the default behaviour. Control characters are replaced by spaces
 * and whitespace is collapsed. The length is checked by the caller, which refuses
 * an over-long title rather than cutting it short.
 */
export function normalizePhotoTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned === "" ? null : cleaned;
}

/**
 * Validates a title typed by the user when editing an existing photo.
 *
 * Unlike the optional upload title, an edited title cannot be cleared: an empty
 * value is refused so the photo cannot silently lose its caption.
 */
export function validatePhotoTitleEdit(
  value: unknown,
): { ok: true; title: string } | { ok: false; error: string } {
  const title = normalizePhotoTitle(value);

  if (title === null) {
    return { ok: false, error: "A photo needs a title." };
  }

  if (title.length > MAX_PHOTO_TITLE_LENGTH) {
    return {
      ok: false,
      error: `A photo title can be at most ${MAX_PHOTO_TITLE_LENGTH} characters.`,
    };
  }

  return { ok: true, title };
}

/** Keeps the name displayable and safe, without a path or control characters. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 200);

  return cleaned || "photo";
}
