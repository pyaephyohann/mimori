import Image from "next/image";
import type { CSSProperties } from "react";

import {
  BowSticker,
  CurlyArrow,
  HeartDoodle,
  SpiralDoodle,
} from "@/components/scrapbook/doodles";
import { photos, type Photo } from "@/lib/photos";
import { daysSince, type WidgetConfig } from "@/lib/widgets/catalog";

/**
 * The eight widget layouts. Each kind renders a genuinely different
 * composition — a frame, a grid, a film strip, a heart, a stack, a framed
 * plate, a note and a counter — rather than one card with a new title.
 */

const photosById = new Map(photos.map((photo) => [photo.id, photo]));

function chosenPhotos(config: WidgetConfig): Photo[] {
  return config.photoIds
    .map((id) => photosById.get(id))
    .filter((photo): photo is Photo => photo !== undefined);
}

const IMAGE_SIZES = "(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 380px";

function PhotoFill({ photo, sizes = IMAGE_SIZES }: { photo: Photo; sizes?: string }) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes={sizes}
      className="object-cover"
    />
  );
}

function MissingPhotos({ children }: { children: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-paper px-3 text-center">
      <HeartDoodle className="h-6 w-6 text-dusty-rose" />
      <p className="text-xs text-paper-foreground/70">{children}</p>
    </div>
  );
}

function PolaroidBody({ config }: { config: WidgetConfig }) {
  const [photo] = chosenPhotos(config);

  if (!photo) {
    return <MissingPhotos>Pick a photo for this polaroid</MissingPhotos>;
  }

  return (
    <figure
      className="scrapbook-tilt relative flex h-full flex-col rounded-[4px] bg-paper p-2 pb-1 shadow-[0_12px_26px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge sm:p-2.5"
      style={{ "--tilt": "-2deg" } as CSSProperties}
    >
      <div className="relative flex-1 overflow-hidden bg-paper-edge">
        <PhotoFill photo={photo} />
      </div>
      <figcaption className="truncate px-1 pt-1.5 text-center font-decorative text-base leading-tight text-paper-foreground">
        {config.text || photo.caption}
      </figcaption>
      <BowSticker className="absolute -top-2.5 -right-2 rotate-6 text-xl" />
    </figure>
  );
}

function GridBody({ config }: { config: WidgetConfig }) {
  const chosen = chosenPhotos(config);

  if (chosen.length === 0) {
    return <MissingPhotos>Choose photos for this grid</MissingPhotos>;
  }

  const columns = chosen.length > 4 ? 3 : 2;

  return (
    <div className="relative h-full overflow-hidden rounded-[4px] bg-paper p-1.5 shadow-[0_12px_26px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge">
      <div
        className="grid h-full gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {chosen.map((photo) => (
          <div key={photo.id} className="relative overflow-hidden bg-paper-edge">
            <PhotoFill photo={photo} />
          </div>
        ))}
      </div>
      <HeartDoodle
        filled
        className="absolute -top-1.5 -left-1.5 h-5 w-5 -rotate-12 text-warm-charcoal/80"
      />
    </div>
  );
}

function FilmStripBody({ config }: { config: WidgetConfig }) {
  const chosen = chosenPhotos(config);

  if (chosen.length === 0) {
    return <MissingPhotos>Choose photos for this film strip</MissingPhotos>;
  }

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[5px] bg-warm-charcoal py-1.5 shadow-[0_12px_26px_-16px_rgba(73,52,61,0.65)]">
      <div
        aria-hidden="true"
        className="h-2.5 w-full bg-[repeating-linear-gradient(90deg,rgba(255,248,250,0.85)_0_6px,transparent_6px_18px)]"
      />
      <div className="flex flex-1 items-center gap-1.5 px-2 py-1">
        {chosen.map((photo) => (
          <div
            key={photo.id}
            className="relative h-full flex-1 overflow-hidden rounded-[2px] bg-paper/20"
          >
            <PhotoFill photo={photo} />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-2.5 w-full bg-[repeating-linear-gradient(90deg,rgba(255,248,250,0.85)_0_6px,transparent_6px_18px)]"
      />
    </div>
  );
}

/** Five scrapbook slots that read as a heart without cutting the photos. */
const HEART_SLOTS = [
  { left: 6, top: 4, width: 40, rotate: -7 },
  { left: 54, top: 2, width: 40, rotate: 6 },
  { left: 30, top: 32, width: 40, rotate: 1 },
  { left: 3, top: 58, width: 38, rotate: -5 },
  { left: 59, top: 56, width: 38, rotate: 8 },
];

function HeartCollageBody({ config }: { config: WidgetConfig }) {
  const chosen = chosenPhotos(config);

  if (chosen.length === 0) {
    return <MissingPhotos>Choose photos for this collage</MissingPhotos>;
  }

  return (
    <div className="relative h-full overflow-hidden rounded-[4px] bg-paper p-1 shadow-[0_12px_26px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge">
      <HeartDoodle
        filled
        className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 text-blush-pink"
      />
      {chosen.slice(0, HEART_SLOTS.length).map((photo, index) => {
        const slot = HEART_SLOTS[index];

        return (
          <div
            key={photo.id}
            className="absolute aspect-square overflow-hidden rounded-[2px] bg-paper p-0.5 shadow-[0_6px_14px_-8px_rgba(73,52,61,0.8)] ring-1 ring-paper-edge"
            style={{
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.width}%`,
              transform: `rotate(${slot.rotate}deg)`,
            }}
          >
            <div className="relative h-full w-full overflow-hidden">
              <PhotoFill photo={photo} />
            </div>
          </div>
        );
      })}
      <BowSticker className="absolute right-1 -bottom-1 text-lg" />
    </div>
  );
}

const STACK_ROTATIONS = [-7, 5, -3, 8];
const STACK_OFFSETS = [
  { left: 4, top: 4 },
  { left: 16, top: 8 },
  { left: 10, top: 16 },
  { left: 22, top: 20 },
];

function PhotoStackBody({ config }: { config: WidgetConfig }) {
  const chosen = chosenPhotos(config);

  if (chosen.length === 0) {
    return <MissingPhotos>Choose photos to stack</MissingPhotos>;
  }

  return (
    <div className="relative h-full">
      {chosen.slice(0, STACK_OFFSETS.length).map((photo, index) => {
        const offset = STACK_OFFSETS[index];

        return (
          <div
            key={photo.id}
            className="absolute w-[62%] rounded-[3px] bg-paper p-1 pb-4 shadow-[0_10px_22px_-12px_rgba(73,52,61,0.75)] ring-1 ring-paper-edge"
            style={{
              left: `${offset.left}%`,
              top: `${offset.top}%`,
              transform: `rotate(${STACK_ROTATIONS[index]}deg)`,
              zIndex: index + 1,
            }}
          >
            <div className="relative aspect-4/3 overflow-hidden bg-paper-edge">
              <PhotoFill photo={photo} />
            </div>
            <p className="truncate pt-1 text-center font-decorative text-xs text-paper-foreground">
              {photo.caption}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MemoryFrameBody({ config }: { config: WidgetConfig }) {
  const [photo] = chosenPhotos(config);

  if (!photo) {
    return <MissingPhotos>Pick a photo for this frame</MissingPhotos>;
  }

  return (
    <div className="relative h-full rounded-[6px] bg-paper p-2 shadow-[0_12px_26px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge">
      <div className="relative h-full w-full overflow-hidden rounded-[3px] border border-dusty-rose/50 p-1">
        <div className="relative h-full w-full overflow-hidden">
          <PhotoFill photo={photo} />
        </div>
        <HeartDoodle className="absolute top-1 left-1 h-4 w-4 text-paper" />
        <HeartDoodle
          filled
          className="absolute right-1 bottom-1 h-4 w-4 rotate-12 text-paper"
        />
      </div>
      <div className="absolute inset-x-4 bottom-3 rounded-[2px] bg-paper/95 px-2 py-1 text-center shadow-sm">
        <p className="truncate font-decorative text-sm text-paper-foreground">
          {config.text || photo.caption}
        </p>
      </div>
      <BowSticker className="absolute -top-2 -left-2 -rotate-12 text-xl" />
    </div>
  );
}

function LoveNoteBody({ config }: { config: WidgetConfig }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[6px] bg-paper px-3 pt-4 pb-3 text-center shadow-[0_12px_26px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge">
      <CurlyArrow className="absolute top-2 left-2 h-5 w-9 -scale-x-100 text-dusty-rose/70" />
      <SpiralDoodle className="absolute right-2 bottom-3 h-4 w-6 text-dusty-rose/70" />
      <BowSticker className="absolute -top-2 -right-1.5 rotate-6 text-lg" />
      <p className="font-decorative text-lg leading-snug text-paper-foreground line-clamp-5">
        {config.text || "You are my favourite place to be."}
      </p>
      <HeartDoodle
        filled
        className="mt-2 h-4 w-4 text-candy-pink"
      />
      <p className="mt-1 text-[10px] tracking-[0.18em] text-paper-foreground/55 uppercase">
        With love
      </p>
    </div>
  );
}

function OurCounterBody({ config }: { config: WidgetConfig }) {
  const total = daysSince(config.date);
  const label = config.text || "days together";

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[6px] bg-paper px-2 text-center shadow-[0_12px_26px_-16px_rgba(73,52,61,0.55)] ring-1 ring-paper-edge">
      <SpiralDoodle className="absolute top-2 right-2 h-4 w-6 text-dusty-rose/70" />
      <HeartDoodle className="absolute bottom-2 left-2 h-5 w-5 -rotate-12 text-dusty-rose/70" />

      <p className="font-decorative text-5xl leading-none text-paper-foreground">
        {total === null ? "—" : total.toLocaleString("en-US")}
      </p>
      <p className="mt-1 text-xs font-medium text-paper-foreground/75">{label}</p>

      {config.date ? (
        <p className="mt-2 text-[10px] tracking-wide text-paper-foreground/55">
          since{" "}
          {new Date(`${config.date}T00:00:00Z`).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-paper-foreground/55">
          pick your start date
        </p>
      )}
    </div>
  );
}

export function WidgetRenderer({ config }: { config: WidgetConfig }) {
  switch (config.kind) {
    case "polaroid":
      return <PolaroidBody config={config} />;
    case "photo-grid":
      return <GridBody config={config} />;
    case "film-strip":
      return <FilmStripBody config={config} />;
    case "heart-collage":
      return <HeartCollageBody config={config} />;
    case "photo-stack":
      return <PhotoStackBody config={config} />;
    case "memory-frame":
      return <MemoryFrameBody config={config} />;
    case "love-note":
      return <LoveNoteBody config={config} />;
    case "our-counter":
      return <OurCounterBody config={config} />;
  }
}
