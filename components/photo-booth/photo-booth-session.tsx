"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HeartDoodle } from "@/components/scrapbook/doodles";
import { restoreBoothSession, type RestoredBooth } from "@/lib/photo-booth/restore";

import { PhotoBooth } from "./photo-booth";

const LOAD_ERROR = "That photobooth could not be opened.";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; booth: RestoredBooth }
  | { status: "error"; error: string };

/**
 * One saved photobooth at its own URL.
 *
 * Fetches the session through the existing `GET /api/photo-booth/[id]` route,
 * restores it with the same validator the library uses, and opens the editor
 * directly. Nothing is written by loading the page.
 */
export function PhotoBoothSession({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/photo-booth/${encodeURIComponent(sessionId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          session?: unknown;
        } | null;

        if (!response.ok) {
          throw new Error(body?.error ?? LOAD_ERROR);
        }

        const restored = restoreBoothSession(body?.session);

        if (!restored.ok) {
          throw new Error(restored.error);
        }

        setState({ status: "ready", booth: restored.value });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          error: cause instanceof Error && cause.message ? cause.message : LOAD_ERROR,
        });
      });

    return () => controller.abort();
  }, [sessionId]);

  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:px-8">
      <Link
        href="/photo-booth"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-paper-edge bg-paper px-4 py-2 text-xs font-semibold text-paper-foreground transition-colors hover:bg-blush-pink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← Back to Photobooths
      </Link>

      {state.status === "loading" ? (
        <p className="mt-8 text-center text-sm text-[var(--brand-white)]">
          Opening your photobooth…
        </p>
      ) : null}

      {state.status === "error" ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl border border-danger-border bg-danger-surface px-4 py-6 text-center text-sm text-danger"
        >
          {state.error}
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <header className="mt-6 text-center">
            <h1 className="flex items-center justify-center gap-2 font-decorative text-4xl leading-none text-[var(--brand-white)] sm:text-5xl">
              <HeartDoodle filled className="h-4 w-4 sm:h-5 sm:w-5" />
              Our Photobooth
            </h1>
          </header>
          <div className="mt-6">
            <PhotoBooth initialBooth={state.booth} />
          </div>
        </>
      ) : null}
    </main>
  );
}
