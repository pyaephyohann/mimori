import { connection } from "next/server";

import { HeroCarousel } from "@/components/hero-carousel";
import { OurLoveStory } from "@/components/our-love-story";
import { WidgetCanvas } from "@/components/widgets/widget-canvas";
import { loadHeroSlots } from "@/lib/hero/server";

/**
 * The gallery viewer can fill a carousel slot, so the slots are read per
 * request instead of being frozen into the build. That makes this route
 * blocking, which is preferable to suspending the carousel behind a
 * placeholder on every visit.
 *
 * The carousel always has eight slots; with an empty gallery they are eight
 * colourful empty squares, never bundled photos.
 */
export const instant = false;

const Home = async () => {
  await connection();

  const { slots, failed } = await loadHeroSlots();

  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:px-8">
      <HeroCarousel slots={slots} failed={failed} />
      <WidgetCanvas />
      <OurLoveStory />
    </main>
  );
};

export default Home;
