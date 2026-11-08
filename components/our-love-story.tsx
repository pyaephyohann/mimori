import {
  BowSticker,
  CurlyArrow,
  HeartDoodle,
  SpiralDoodle,
} from "@/components/scrapbook/doodles";
import { HeartOutline } from "@/components/scrapbook/heart-outline";

const HEADING_WORDS = ["Our", "Love", "Story"] as const;

/** Milliseconds between neighbouring letters, so the highlight travels across
 *  the word instead of every letter glowing at once. */
const LETTER_STAGGER_MS = 60;

/** The heading is one flat string for assistive tech and a span per letter for
 *  the eye; this walks the words once so each letter knows its own delay. */
const LETTER_DELAYS = HEADING_WORDS.map((_, wordIndex) => {
  const lettersBefore = HEADING_WORDS.slice(0, wordIndex).reduce(
    (total, word) => total + word.length,
    0,
  );

  return Array.from(
    { length: HEADING_WORDS[wordIndex].length },
    (_, letterIndex) => (lettersBefore + letterIndex) * LETTER_STAGGER_MS,
  );
});

/**
 * The reference's title band: a centred brush-script heading flanked by a
 * filled heart on the left and an outlined heart on the right, with a spiral
 * and a curly arrow sketched at the outer edges.
 *
 * Text on the page canvas uses the fixed Warm Charcoal brand token, because
 * Hot Pink is the page background in Mimori's single, light-only palette. The
 * heading itself is the exception: it is pure white, and each letter carries
 * the travelling pink glint described by `love-story-letter` in
 * `app/globals.css`.
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

        <div className="relative isolate">
          {/* Sketched around the heading on arrival; it sits behind the
              letters, so it can never cover a word. */}
          <HeartOutline className="-inset-x-5 -inset-y-4 text-[var(--brand-white)]/55 sm:-inset-x-7 sm:-inset-y-5" />

          <h2
            id="love-story-heading"
            className="relative font-decorative text-4xl leading-none sm:text-5xl lg:text-6xl"
          >
            {/* Screen readers get the heading as one phrase; the per-letter
                spans beside it exist only for the highlight. */}
            <span className="sr-only">Our Love Story</span>

            <span
              aria-hidden="true"
              className="flex flex-wrap items-baseline justify-center gap-x-[0.24em]"
            >
              {HEADING_WORDS.map((word, wordIndex) => (
                <span key={word} className="flex">
                  {Array.from(word).map((letter, letterIndex) => (
                    <span
                      key={`${letterIndex}-${letter}`}
                      className="love-story-letter"
                      style={{
                        animationDelay: `${LETTER_DELAYS[wordIndex][letterIndex]}ms`,
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h2>
        </div>

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
