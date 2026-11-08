/**
 * The photobooth print renderer.
 *
 * Browser-only drawing code: it takes the same `composeBooth` geometry the DOM
 * preview uses, paints it into a `<canvas>` and produces a JPEG. Every
 * coordinate is in composition units, so the exported print cannot drift from
 * what the editor showed — there is no second layout calculation here.
 *
 * Text waits for the real Caveat and Roboto faces. A capture that fails to
 * decode draws the print's paper placeholder; a saved Cloudinary photo that will
 * not load fails the export instead, because a reopened session exporting a
 * blank frame would quietly destroy the print the visitor came back to edit.
 */

import type { BorderTemplate } from "./borders.ts";
import type { CompositionGeometry, PlacedSticker, Rect } from "./compose.ts";
import { fitCaptionSize } from "./editor.ts";
import {
  DOT_OFFSET,
  DOT_OPACITY,
  DOT_RADIUS,
  DOT_TILE,
  RULE_OPACITY,
  RULE_THICKNESS,
  RULE_TILE,
  RULE_TOP,
  SPROCKET_HOLE_HEIGHT,
  SPROCKET_HOLE_RADIUS,
  SPROCKET_HOLE_TOP,
  SPROCKET_HOLE_WIDTH,
  SPROCKET_HOLE_X,
  SPROCKET_OPACITY,
  SPROCKET_TILE,
  sprocketBands,
} from "./patterns.ts";

/** The exported print's width in pixels; the height follows the geometry. */
export const PRINT_WIDTH = 1600;

export const PRINT_TYPE = "image/jpeg";
export const PRINT_QUALITY = 0.92;

const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const PHOTO_FILL = ["#FFF8FA", "#F9E1EA", "#E88EAD"] as const;

/** A capture's Blob, or a saved photo's Cloudinary URL. */
export type BoothPhotoSource = Blob | string;

export type BoothPrintInput = {
  geometry: CompositionGeometry;
  template: BorderTemplate;
  /** One source per slot, in capture order; null paints the placeholder. */
  photos: readonly (BoothPhotoSource | null)[];
  /** The title line, already trimmed; empty hides it. */
  caption: string;
  /** The formatted date line; empty hides it. */
  date: string;
};

type Text = {
  family: string;
  weight: number;
};

function cssVariable(name: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

async function settleFont(spec: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }

  try {
    await document.fonts.load(spec);
  } catch {
    // A missing font degrades to the fallback stack; the print still renders.
  }
}

function roundedPath(
  context: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
): void {
  const corner = Math.max(
    0,
    Math.min(radius, rect.width / 2, rect.height / 2),
  );

  context.beginPath();
  context.moveTo(rect.x + corner, rect.y);
  context.arcTo(
    rect.x + rect.width,
    rect.y,
    rect.x + rect.width,
    rect.y + rect.height,
    corner,
  );
  context.arcTo(
    rect.x + rect.width,
    rect.y + rect.height,
    rect.x,
    rect.y + rect.height,
    corner,
  );
  context.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, corner);
  context.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, corner);
  context.closePath();
}

/** The frame paper, its pattern and its hairline edge. */
function paintPaper(
  context: CanvasRenderingContext2D,
  geometry: CompositionGeometry,
  template: BorderTemplate,
  borderWidth: number,
): void {
  const radius = geometry.width * 0.025;

  roundedPath(context, geometry.frame, radius);
  context.fillStyle = geometry.background;
  context.fill();

  context.save();
  roundedPath(context, geometry.frame, radius);
  context.clip();

  context.fillStyle = template.patternColor;

  if (template.pattern === "dots") {
    context.globalAlpha = DOT_OPACITY;

    for (let y = DOT_OFFSET; y < geometry.height; y += DOT_TILE) {
      for (let x = DOT_OFFSET; x < geometry.width; x += DOT_TILE) {
        context.beginPath();
        context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  if (template.pattern === "ruled") {
    context.globalAlpha = RULE_OPACITY;

    for (let y = RULE_TOP; y < geometry.height; y += RULE_TILE) {
      context.fillRect(0, y, geometry.width, RULE_THICKNESS);
    }
  }

  if (template.pattern === "sprockets") {
    context.globalAlpha = SPROCKET_OPACITY;

    for (const band of sprocketBands(geometry.height, borderWidth)) {
      const y = band.y + SPROCKET_HOLE_TOP;

      for (let x = SPROCKET_HOLE_X; x < geometry.width; x += SPROCKET_TILE) {
        roundedPath(
          context,
          {
            x,
            y,
            width: SPROCKET_HOLE_WIDTH,
            height: SPROCKET_HOLE_HEIGHT,
          },
          SPROCKET_HOLE_RADIUS,
        );
        context.fill();
      }
    }
  }

  context.restore();
  context.globalAlpha = 1;

  roundedPath(context, geometry.frame, radius);
  context.strokeStyle = template.edge;
  context.lineWidth = 2;
  context.stroke();
}

function paintPlaceholder(
  context: CanvasRenderingContext2D,
  slot: Rect,
): void {
  const gradient = context.createLinearGradient(
    slot.x,
    slot.y,
    slot.x + slot.width,
    slot.y + slot.height,
  );

  gradient.addColorStop(0, PHOTO_FILL[0]);
  gradient.addColorStop(0.55, PHOTO_FILL[1]);
  gradient.addColorStop(1, PHOTO_FILL[2]);

  context.fillStyle = gradient;
  context.fillRect(slot.x, slot.y, slot.width, slot.height);

  context.fillStyle = "#FFFFFF";
  context.globalAlpha = 0.7;
  context.font = `${Math.round(slot.width * 0.16)}px ${EMOJI_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "♥",
    slot.x + slot.width / 2,
    slot.y + slot.height / 2,
  );
  context.globalAlpha = 1;
}

function paintPhoto(
  context: CanvasRenderingContext2D,
  slot: Rect,
  image: HTMLImageElement | null,
): void {
  const radius = slot.width * 0.015;

  context.save();
  roundedPath(context, slot, radius);
  context.clip();

  if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
    paintPlaceholder(context, slot);
  } else {
    const scale = Math.max(
      slot.width / image.naturalWidth,
      slot.height / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    context.drawImage(
      image,
      slot.x + (slot.width - width) / 2,
      slot.y + (slot.height - height) / 2,
      width,
      height,
    );
  }

  context.restore();

  roundedPath(context, slot, radius);
  context.strokeStyle = "rgba(255, 255, 255, 0.75)";
  context.lineWidth = 2;
  context.stroke();
}

function paintCaption(
  context: CanvasRenderingContext2D,
  geometry: CompositionGeometry,
  template: BorderTemplate,
  caption: string,
  date: string,
  script: Text,
  body: Text,
): void {
  const plate = geometry.caption;
  const metrics = geometry.captionText;

  if (!plate || !metrics) {
    return;
  }

  const radius = plate.width * 0.015;

  roundedPath(context, plate, radius);
  context.fillStyle = template.caption.plate;
  context.fill();

  context.strokeStyle = template.edge;
  context.globalAlpha = 0.35;
  context.lineWidth = 1.5;
  context.stroke();
  context.globalAlpha = 1;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = template.caption.color;

  const title = caption.trim();

  if (title) {
    const size = fitCaptionSize(title, metrics.title.fontSize, metrics.title.width);

    context.font = `${script.weight} ${size}px ${script.family}`;
    context.fillText(
      title,
      metrics.title.x + metrics.title.width / 2,
      metrics.title.y + metrics.title.height / 2,
    );
  }

  if (date) {
    context.font = `${body.weight} ${metrics.date.fontSize}px ${body.family}`;
    context.globalAlpha = 0.78;
    context.fillText(
      date.toUpperCase(),
      metrics.date.x + metrics.date.width / 2,
      metrics.date.y + metrics.date.height / 2,
    );
    context.globalAlpha = 1;
  }
}

function paintEmoji(
  context: CanvasRenderingContext2D,
  glyph: string,
  centreX: number,
  centreY: number,
  size: number,
  rotate: number,
): void {
  context.save();
  context.translate(centreX, centreY);
  context.rotate((rotate * Math.PI) / 180);
  context.font = `${size}px ${EMOJI_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(glyph, 0, 0);
  context.restore();
}

function paintSticker(
  context: CanvasRenderingContext2D,
  sticker: PlacedSticker,
): void {
  paintEmoji(
    context,
    sticker.glyph,
    sticker.left + sticker.side / 2,
    sticker.top + sticker.side / 2,
    sticker.side,
    sticker.rotate,
  );
}

/**
 * Loads one photograph for drawing.
 *
 * A capture is an in-memory Blob, so it gets a temporary object URL that is
 * revoked as soon as the image has settled. A reopened session's photo is a
 * Cloudinary URL and is requested anonymously, which keeps the canvas untainted
 * so `toBlob` can still export it.
 */
function loadPhoto(
  source: BoothPhotoSource | null,
): Promise<HTMLImageElement | null> {
  if (!source) {
    return Promise.resolve(null);
  }

  const fromBlob = typeof source !== "string";
  const url = fromBlob ? URL.createObjectURL(source) : source;

  return new Promise((resolve) => {
    const image = new Image();

    const settle = (value: HTMLImageElement | null) => {
      if (fromBlob) {
        URL.revokeObjectURL(url);
      }

      resolve(value);
    };

    if (!fromBlob) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => settle(image);
    image.onerror = () => settle(null);
    image.src = url;
  });
}

/**
 * Decodes every slot.
 *
 * `missing` is true when a saved photo could not be fetched: the caller refuses
 * to export rather than printing a placeholder over a photo that exists.
 */
async function loadPhotos(
  photos: readonly (BoothPhotoSource | null)[],
): Promise<{ images: (HTMLImageElement | null)[]; missing: boolean }> {
  const images = await Promise.all(photos.map((source) => loadPhoto(source)));
  const missing = photos.some(
    (source, index) => typeof source === "string" && images[index] === null,
  );

  return { images, missing };
}

/**
 * Draws the print into a canvas at `PRINT_WIDTH` (or `width`).
 *
 * The context is scaled once, so every rectangle below is used exactly as the
 * geometry returned it.
 */
export async function renderBoothCanvas(
  input: BoothPrintInput,
  width = PRINT_WIDTH,
): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") {
    throw new Error("The photobooth print can only be rendered in a browser.");
  }

  const { geometry, template } = input;
  const { images, missing } = await loadPhotos(input.photos);

  if (missing) {
    throw new Error(
      "Some of this print's saved photos could not be loaded. Check your connection and try again.",
    );
  }

  const scale = width / geometry.width;
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(geometry.width * scale));
  canvas.height = Math.max(1, Math.round(geometry.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not prepare the print.");
  }

  const script: Text = {
    family: cssVariable("--font-caveat", "cursive"),
    weight: 600,
  };
  const body: Text = {
    family: cssVariable("--font-roboto", "sans-serif"),
    weight: 500,
  };

  const titleSize = input.caption.trim()
    ? fitCaptionSize(
        input.caption.trim(),
        geometry.captionText?.title.fontSize ?? 34,
        geometry.captionText?.title.width ?? geometry.width,
      )
    : 0;

  await Promise.all([
    settleFont(`${script.weight} ${Math.max(16, titleSize)}px ${script.family}`),
    settleFont(
      `${body.weight} ${Math.max(10, geometry.captionText?.date.fontSize ?? 18)}px ${body.family}`,
    ),
  ]);

  context.scale(scale, scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const borderWidth = geometry.inner.x;

  // JPEG has no transparency, so the paper fills the whole rectangle first:
  // the rounded frame's corners would otherwise export black.
  context.fillStyle = geometry.background;
  context.fillRect(0, 0, geometry.width, geometry.height);

  paintPaper(context, geometry, template, borderWidth);

  geometry.slots.forEach((slot, index) => {
    paintPhoto(context, slot, images[index] ?? null);
  });

  paintCaption(
    context,
    geometry,
    template,
    input.caption,
    input.date,
    script,
    body,
  );

  for (const decoration of geometry.decorations) {
    paintEmoji(
      context,
      decoration.glyph,
      decoration.x + decoration.size / 2,
      decoration.y + decoration.size / 2,
      decoration.size,
      decoration.rotate,
    );
  }

  for (const sticker of geometry.stickers) {
    paintSticker(context, sticker);
  }

  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The print could not be saved as a JPEG."));
        }
      },
      PRINT_TYPE,
      PRINT_QUALITY,
    );
  });
}

/** The finished print as a JPEG blob, at `PRINT_WIDTH` unless asked otherwise. */
export async function renderBoothJpeg(
  input: BoothPrintInput,
  width = PRINT_WIDTH,
): Promise<Blob> {
  const canvas = await renderBoothCanvas(input, width);

  return canvasToJpeg(canvas);
}
