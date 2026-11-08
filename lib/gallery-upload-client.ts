/**
 * Sending one photo to the upload endpoint, from the browser.
 *
 * Shared by the Gallery's upload dialog and the Photo Booth's save flow so both
 * use one request shape, one progress report and one set of error messages —
 * there is no second upload path. The server still validates everything; this
 * only reports what happened.
 */

import type { UploadKind } from "./photo-upload.ts";

/** How long a single upload may take before it is reported as too slow. */
const UPLOAD_TIMEOUT_MS = 60_000;

type UploadResponse = {
  error?: string;
  duplicate?: boolean;
  photo?: { id?: string };
};

export type UploadedPhoto = {
  /** The `Photo` row's id, needed to reference the photo in a session. */
  photoId: string;
  /** True when the server recognised an already-stored gallery photo. */
  duplicate: boolean;
};

type UploadOptions = {
  /** Defaults to a gallery photo on the server when omitted. */
  kind?: UploadKind;
  /** The photo's own title; omitted or empty means no caption. */
  title?: string;
  onProgress?: (percent: number) => void;
};

/**
 * Uploads one file and reports real upload progress.
 *
 * `fetch` cannot observe upload progress, so this is the one place the app uses
 * `XMLHttpRequest`.
 */
export function uploadPhotoFile(
  file: File,
  { kind, title, onProgress }: UploadOptions = {},
): Promise<UploadedPhoto> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", "/api/photos/upload");
    request.timeout = UPLOAD_TIMEOUT_MS;

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      let body: UploadResponse = {};

      try {
        body = JSON.parse(request.responseText) as UploadResponse;
      } catch {
        // A gateway error page is not JSON; the status check below covers it.
      }

      if (request.status >= 200 && request.status < 300) {
        const photoId = body.photo?.id;

        if (!photoId) {
          reject(
            new Error(
              "That photo was stored but could not be registered. Try again.",
            ),
          );
          return;
        }

        resolve({ photoId, duplicate: body.duplicate === true });
        return;
      }

      reject(new Error(body.error ?? "That photo could not be uploaded."));
    };

    request.onerror = () => {
      reject(
        new Error(
          "The upload was interrupted. Check your connection and try again.",
        ),
      );
    };

    request.ontimeout = () => {
      reject(new Error("That upload took too long. Try again."));
    };

    const form = new FormData();
    form.append("file", file);

    if (kind) {
      form.append("kind", kind);
    }

    if (title) {
      form.append("title", title);
    }

    request.send(form);
  });
}
