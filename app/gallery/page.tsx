import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PhotoGallery } from "@/components/photo-gallery";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { HeartOutline } from "@/components/scrapbook/heart-outline";
import { loadGalleryPhotos } from "@/lib/gallery-photos";

export const metadata: Metadata = {
  title: "Gallery — Mimori",
  description: "Every little moment, pinned to the page.",
};

const GalleryPage = () => {
  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:px-8">
      {/* Extra room below the whole introduction, so the first row of
          polaroids does not crowd the copy. */}
      <header className="mb-14 text-center sm:mb-20 lg:mb-24">
        <p className="text-[10px] tracking-[0.22em] text-[var(--brand-white)] uppercase">
          Mimori scrapbook
        </p>

        <div className="relative isolate mt-1 inline-flex">
          {/* The heart is drawn behind the heading, so its stroke never
              covers a letter. */}
          <HeartOutline className="-inset-x-6 -inset-y-4 text-[var(--brand-white)]/60 sm:-inset-x-8 sm:-inset-y-5" />

          <h1 className="relative flex items-center justify-center gap-2 font-decorative text-4xl leading-none text-[var(--brand-white)] sm:text-5xl">
            <HeartDoodle filled className="h-4 w-4 sm:h-5 sm:w-5" />
            Our Gallery
            <BowSticker className="text-2xl sm:text-3xl" />
          </h1>
        </div>

        <p className="mt-2 text-xs text-[var(--brand-white)] sm:text-sm">
          Every little moment, pinned to the page.
        </p>
      </header>

      <Suspense fallback={<GalleryPlaceholder />}>
        <GalleryPhotos />
      </Suspense>
    </main>
  );
};

async function GalleryPhotos() {
  // The photos live in the shared database, so this section is rendered per
  // request rather than into the static shell. The database is the only image
  // source: an empty table shows the empty state and a failed query shows an
  // error, neither of which falls back to bundled photos.
  await connection();

  const { photos, failed } = await loadGalleryPhotos();

  return <PhotoGallery photos={photos} failed={failed} />;
}

function GalleryPlaceholder() {
  return (
    <p className="mx-auto max-w-sm bg-paper px-6 py-10 text-center font-decorative text-xl text-paper-foreground shadow-sm">
      Pinning the photos to the page…
    </p>
  );
}

export default GalleryPage;
