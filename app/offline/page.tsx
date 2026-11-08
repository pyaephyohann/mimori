import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline · Mimori",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="font-decorative text-4xl text-heading">Mimori is resting</p>
      <p className="text-foreground">
        You&apos;re offline right now. Your memories are safe, and they&apos;ll
        be here as soon as the connection comes back.
      </p>
      <p className="text-sm text-muted-foreground">
        Uploads, saves and edits need an internet connection.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Try again
      </Link>
    </main>
  );
}
