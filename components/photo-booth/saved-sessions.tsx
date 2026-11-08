"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { formatBoothDate } from "@/lib/photo-booth/editor";
import type { BoothSessionSummary } from "@/lib/photo-booth/summary";

type SavedSessionsProps = {
  sessions: readonly BoothSessionSummary[];
  status: "loading" | "ready" | "error";
  error: string | null;
  onRetry: () => void;
};

function CardShell({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-2xl border border-paper-edge bg-white/70 p-2">
      {children}
    </li>
  );
}

/**
 * The booths this scrapper has already saved.
 *
 * Every card is the session's finished print — an ordinary gallery photo — so
 * the library shows exactly what reopening it will look like. Opening fetches
 * the session and its original captures; nothing is uploaded, copied or
 * changed by looking. The new-booth setup below is untouched, so a saved print
 * never stands in for starting a fresh session.
 */
export function SavedSessions({
  sessions,
  status,
  error,
  onRetry,
}: SavedSessionsProps) {
  return (
    <section
      aria-labelledby="saved-booths-heading"
      className="mt-6 rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:mt-8 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2
          id="saved-booths-heading"
          className="flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
        >
          Our Photobooths
          <HeartDoodle filled className="h-4 w-4 text-candy-pink" />
        </h2>

        {status === "ready" && sessions.length > 0 ? (
          <span className="rounded-full bg-blush-pink px-3 py-1 text-[11px] font-medium text-deep-candy-pink">
            {sessions.length} {sessions.length === 1 ? "booth" : "booths"}
          </span>
        ) : null}
      </div>

      {status === "loading" ? (
        <ul
          aria-label="Loading your saved photobooths"
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {[0, 1, 2].map((index) => (
            <CardShell key={`skeleton-${index}`}>
              <span className="block aspect-[3/4] w-full rounded-xl bg-blush-pink/50 motion-safe:animate-pulse" />
              <span className="mt-2 block h-3 w-2/3 rounded-full bg-blush-pink/60 motion-safe:animate-pulse" />
              <span className="mt-1.5 block h-2.5 w-1/2 rounded-full bg-blush-pink/40 motion-safe:animate-pulse" />
            </CardShell>
          ))}
        </ul>
      ) : null}

      {status === "error" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-paper-edge bg-white/60 px-4 py-6 text-center">
          <p className="text-xs leading-relaxed text-paper-foreground/70">
            {error ?? "Your saved booths could not be loaded right now."}
          </p>
          <p className="mt-1 text-[11px] text-paper-foreground/50">
            New booths still work — only the list of saved ones is missing.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 cursor-pointer rounded-full border border-paper-edge px-4 py-2 text-xs font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Try again
          </button>
        </div>
      ) : null}

      {status === "ready" && sessions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-paper-edge bg-white/60 px-4 py-8 text-center">
          <p className="flex items-center justify-center gap-1.5 font-decorative text-xl text-paper-foreground">
            No saved booths yet
            <BowSticker className="text-base" />
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-paper-foreground/60">
            Make your first print below and it will be kept here, ready to
            decorate again another day.
          </p>
        </div>
      ) : null}

      {status === "ready" && sessions.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sessions.map((session) => {
            const date = session.printDate
              ? formatBoothDate(session.printDate)
              : "";

            return (
              <CardShell key={session.id}>
                <Link
                  href={`/photo-booth/${encodeURIComponent(session.id)}`}
                  aria-label={`Open the photobooth ${
                    session.caption || "from this booth"
                  } for editing`}
                  className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    className={`grid aspect-[3/4] w-full content-center gap-1 overflow-hidden rounded-xl bg-blush-pink/40 p-1 ring-1 ring-white/70 ${
                      session.shotThumbs.length === 3 ||
                      session.shotThumbs.length === 6
                        ? "grid-cols-3"
                        : "grid-cols-2"
                    }`}
                  >
                    {session.shotThumbs.map((shot) => (
                      <span
                        key={shot.id}
                        className="relative block aspect-square overflow-hidden rounded-md bg-white/60"
                      >
                        <Image
                          src={shot.src}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 20vw, 9rem"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </span>

                  <span className="mt-2 block truncate font-decorative text-lg leading-tight text-paper-foreground">
                    {session.caption || "Our little photobooth"}
                  </span>

                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-paper-foreground/60">
                    <span>{session.shotCount} photos</span>
                    {date ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{date}</span>
                      </>
                    ) : null}
                  </span>

                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-deep-candy-pink">
                    Open & keep editing
                    <HeartDoodle filled className="h-3 w-3" />
                  </span>
                </Link>
              </CardShell>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
