"use client";

import { useId } from "react";
import type { ReactNode } from "react";

import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import {
  BORDER_CATALOG,
  getBorderTemplate,
  type BorderKey,
} from "@/lib/photo-booth/borders";
import {
  LAYOUT_OPTIONS,
  PHOTO_COUNT_OPTIONS,
  type BoothLayout,
  type PhotoCount,
} from "@/lib/photo-booth/catalog";

import { BorderPreview } from "./border-preview";
import { OptionCard } from "./option-card";

type SetupStepProps = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  borderKey: BorderKey;
  onPhotoCountChange: (count: PhotoCount) => void;
  onLayoutChange: (layout: BoothLayout) => void;
  onBorderChange: (borderKey: BorderKey) => void;
  /** Opens the camera with the current choices. */
  onStart: () => void;
};

/** Warm photo-slot fill, so a count card reads as places for pictures. */
const TILE_BACKGROUND =
  "linear-gradient(150deg, #FFF8FA 0%, #F9E1EA 55%, #E88EAD 100%)";

/**
 * The count cards' miniature: one tile per photo, arranged the way the chosen
 * layout stacks them. This is a symbol rather than a print — the layout and
 * border cards below show the true composition proportions.
 */
function CountPreview({
  count,
  layout,
}: {
  count: PhotoCount;
  layout: BoothLayout;
}) {
  if (layout === "strip") {
    return (
      <span
        aria-hidden="true"
        className="flex h-full w-full flex-col gap-[3px] p-2"
      >
        {Array.from({ length: count }).map((_unused, index) => (
          <span
            key={`tile-${index}`}
            className="min-h-0 flex-1 rounded-[2px] ring-1 ring-white/70"
            style={{ backgroundImage: TILE_BACKGROUND }}
          />
        ))}
      </span>
    );
  }

  const columns = count <= 3 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);

  return (
    <span
      aria-hidden="true"
      className="grid h-full w-full gap-[3px] p-2"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_unused, index) => (
        <span
          key={`tile-${index}`}
          className="min-h-0 rounded-[2px] ring-1 ring-white/70"
          style={{ backgroundImage: TILE_BACKGROUND }}
        />
      ))}
    </span>
  );
}

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:p-6"
    >
      <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
        Step {step}
      </p>
      <h2
        id={headingId}
        className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
      >
        {title}
        <BowSticker className="text-sm" />
      </h2>
      <p className="mt-1 max-w-xl text-xs text-paper-foreground/65">
        {description}
      </p>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-paper-edge pb-2 last:border-0 last:pb-0">
      <dt className="text-xs tracking-wide text-paper-foreground/55 uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium text-paper-foreground">{value}</dd>
    </div>
  );
}

/**
 * The booth's setup choices: photo count, layout and border, then a live print
 * of the current choice. They are rendered inside the setup sheet, and all
 * three choices live in `PhotoBooth`, so the camera and editor steps read the
 * same state later.
 */
export function SetupStep({
  photoCount,
  layout,
  borderKey,
  onPhotoCountChange,
  onLayoutChange,
  onBorderChange,
  onStart,
}: SetupStepProps) {
  const previewId = useId();
  const selectedLayout = LAYOUT_OPTIONS.find(
    (option) => option.layout === layout,
  );
  const selectedBorder = getBorderTemplate(borderKey);

  return (
    <div className="space-y-5 sm:space-y-6">
      <Section
        step={1}
        title="How many photos?"
        description="Pick how many little moments you want to keep in one print."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PHOTO_COUNT_OPTIONS.map((option) => (
            <OptionCard
              key={option.count}
              selected={photoCount === option.count}
              onSelect={() => onPhotoCountChange(option.count)}
              title={option.title}
              blurb={option.blurb}
              badge={option.badge}
              previewClassName="h-20 sm:h-24"
              preview={
                <CountPreview count={option.count} layout={layout} />
              }
            />
          ))}
        </div>
      </Section>

      <Section
        step={2}
        title="Which shape?"
        description="A long strip to tuck into a scrapbook, or a square page."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {LAYOUT_OPTIONS.map((option) => (
            <OptionCard
              key={option.layout}
              selected={layout === option.layout}
              onSelect={() => onLayoutChange(option.layout)}
              title={option.title}
              blurb={option.blurb}
              badge={option.badge}
              previewClassName="h-40 sm:h-44"
              preview={
                <BorderPreview
                  borderKey={borderKey}
                  photoCount={photoCount}
                  layout={option.layout}
                />
              }
            />
          ))}
        </div>
      </Section>

      <Section
        step={3}
        title="Pick a border"
        description="Six papers to wrap your photos in. You can change this later."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BORDER_CATALOG.map((template) => (
            <OptionCard
              key={template.key}
              selected={borderKey === template.key}
              onSelect={() => onBorderChange(template.key)}
              title={template.title}
              blurb={template.blurb}
              previewClassName="h-36 sm:h-44"
              preview={
                <BorderPreview
                  borderKey={template.key}
                  photoCount={photoCount}
                  layout={layout}
                />
              }
            />
          ))}
        </div>
      </Section>

      <section
        aria-labelledby={previewId}
        className="rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
              Preview
            </p>
            <h2
              id={previewId}
              className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl"
            >
              Your booth so far
              <HeartDoodle filled className="h-4 w-4 text-candy-pink" />
            </h2>
          </div>

          <span className="rounded-full bg-blush-pink px-3 py-1 text-[11px] font-medium text-deep-candy-pink">
            Updates as you pick
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex h-72 items-center justify-center rounded-2xl bg-blush-pink/35 p-4 ring-1 ring-paper-edge sm:h-96">
            <BorderPreview
              borderKey={borderKey}
              photoCount={photoCount}
              layout={layout}
              className="h-full"
            />
          </div>

          <div className="flex flex-col justify-center">
            <dl className="space-y-2">
              <SummaryRow label="Photos" value={`${photoCount} photos`} />
              <SummaryRow
                label="Shape"
                value={selectedLayout?.title ?? "Vertical strip"}
              />
              <SummaryRow label="Border" value={selectedBorder.title} />
            </dl>

            <p className="mt-3 text-xs leading-relaxed text-paper-foreground/65">
              {selectedBorder.blurb}
            </p>

            <p className="mt-4 flex items-center gap-1.5 font-decorative text-base text-dusty-rose">
              <BowSticker className="text-sm" />
              Change anything above and the print follows along.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Start the photobooth"
        className="rounded-[26px] border border-paper-edge bg-paper p-5 text-center shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:p-6"
      >
        <p className="font-decorative text-2xl leading-tight text-paper-foreground">
          All set?
        </p>
        <p className="mt-1 text-xs text-paper-foreground/65">
          The camera turns on only when you tap start.
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Start Photobooth
          <BowSticker className="text-base" />
        </button>
      </section>
    </div>
  );
}
