import { HeroCarousel } from "@/components/hero-carousel";
import { OurLoveStory } from "@/components/our-love-story";
import { PhotoGallery } from "@/components/photo-gallery";
import { WidgetCanvas } from "@/components/widgets/widget-canvas";
import { photos } from "@/lib/photos";

const Home = () => {
  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:px-8">
      <HeroCarousel photos={photos} />
      <WidgetCanvas />
      <PhotoGallery photos={photos} />
      <OurLoveStory />
    </main>
  );
};

export default Home;
