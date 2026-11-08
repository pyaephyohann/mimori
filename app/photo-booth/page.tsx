import type { Metadata } from "next";

import { PhotoBooth } from "@/components/photo-booth/photo-booth";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { HeartOutline } from "@/components/scrapbook/heart-outline";

export const metadata: Metadata = {
  title: "Photo Booth — Mimori",
  description: "A little photobooth for the two of us.",
};

const PhotoBoothPage = () => {
  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:px-8">
      <header className="text-center">
        <p className="text-[10px] tracking-[0.22em] text-[var(--brand-white)] uppercase">
          Mimori photobooth
        </p>

        <div className="relative isolate mt-1 inline-flex">
          <HeartOutline className="-inset-x-6 -inset-y-4 text-[var(--brand-white)]/60 sm:-inset-x-8 sm:-inset-y-5" />

          <h1 className="relative flex items-center justify-center gap-2 font-decorative text-4xl leading-none text-[var(--brand-white)] sm:text-5xl">
            <HeartDoodle filled className="h-4 w-4 sm:h-5 sm:w-5" />
            Our Little Photobooth
            <BowSticker className="text-2xl sm:text-3xl" />
          </h1>
        </div>

        <p className="mt-2 text-xs text-[var(--brand-white)] sm:text-sm">
          Let’s make some memories together.
        </p>
      </header>

      <PhotoBooth />
    </main>
  );
};

export default PhotoBoothPage;
