import {
  BowSticker,
  CurlyArrow,
  HeartDoodle,
  SpiralDoodle,
} from "@/components/scrapbook/doodles";

/**
 * The reference's title band: a centred brush-script heading flanked by a
 * filled heart on the left and an outlined heart on the right, with a spiral
 * and a curly arrow sketched at the outer edges.
 *
 * Text on the page canvas uses the fixed Warm Charcoal brand token in both
 * themes: `--heading` turns near-white in dark mode and would sit unreadably
 * on the Hot Pink canvas (see docs/KNOWN_ISSUES.md, ISSUE-004).
 */
export function OurLoveStory() {
  return (
    <section
      aria-labelledby="love-story-heading"
      className="relative mt-16 flex flex-col items-center pb-4 sm:mt-24"
    >
      <div className="flex items-center justify-center gap-2.5 sm:gap-4">
        <SpiralDoodle className="hidden h-7 w-11 text-warm-charcoal/70 sm:block" />

        <HeartDoodle
          filled
          className="h-5 w-5 shrink-0 text-warm-charcoal sm:h-7 sm:w-7"
        />

        <h2
          id="love-story-heading"
          className="font-decorative text-4xl leading-none text-warm-charcoal sm:text-5xl lg:text-6xl"
        >
          Our Love Story
        </h2>

        <HeartDoodle className="h-6 w-6 shrink-0 text-warm-charcoal sm:h-9 sm:w-9" />

        <CurlyArrow className="hidden h-8 w-16 -scale-x-100 text-warm-charcoal/70 sm:block" />
      </div>

      <div className="mt-5 flex items-center gap-4 sm:mt-6">
        <HeartDoodle className="scrapbook-float h-5 w-5 text-warm-charcoal/75" />
        <BowSticker className="scrapbook-sway text-2xl sm:text-3xl" />
        <HeartDoodle
          filled
          className="scrapbook-float h-4 w-4 text-warm-charcoal/75"
        />
      </div>
    </section>
  );
}
