/**
 * Reading Cloudinary's answer to an `image/destroy` call.
 *
 * Kept free of `server-only` and `fetch`, so the mapping from a status and a
 * response body to "destroyed", "was already gone" or "failed" can be executed
 * directly (see `cloudinary-result.test.ts`). The caller still does the signed
 * request; this only decides what its answer means.
 */

export type ImageDestroyResult =
  | {
      ok: true;
      /** True when Cloudinary no longer had the asset, so nothing was removed. */
      alreadyMissing: boolean;
    }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readDestroyOutcome(
  status: number,
  body: unknown,
): ImageDestroyResult {
  if (status < 200 || status >= 300) {
    return { ok: false, error: `status ${status}` };
  }

  const result =
    isRecord(body) && typeof body.result === "string" ? body.result : null;

  if (result === "ok") {
    return { ok: true, alreadyMissing: false };
  }

  // Cloudinary reports an asset it has already lost this way. The goal — the
  // file is gone — already holds, so it is not a failure.
  if (result === "not found") {
    return { ok: true, alreadyMissing: true };
  }

  return { ok: false, error: result ?? "unexpected response" };
}
