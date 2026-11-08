import { normalizeUploadMime, uploadSizeError, UPLOAD_FORMAT_LABEL } from "../photo-upload.ts";

/**
 * Pure rules for the Add Widgets "Upload a new photo" option.
 *
 * Kept free of React and browser APIs so they can be covered by `node:test`.
 * The file checks reuse the Gallery's own validators, so both upload paths
 * accept the same formats and sizes.
 */

/** A message for a file the widget flow must not upload, or `null` when it may be sent. */
export function widgetUploadFileError(file: {
  type: string;
  size: number;
}): string | null {
  const sizeError = uploadSizeError(file.size);

  if (sizeError) {
    return sizeError;
  }

  return normalizeUploadMime(file.type)
    ? null
    : `Only ${UPLOAD_FORMAT_LABEL} images can be uploaded.`;
}
