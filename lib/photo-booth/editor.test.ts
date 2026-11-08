import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BACKGROUND_KEYS, backgroundColour, isBackgroundKey } from "./backgrounds.ts";
import { DEFAULT_BORDER_KEY } from "./borders.ts";
import { MAX_STICKER_SIZE, MIN_STICKER_SIZE } from "./compose.ts";
import {
  MAX_CAPTION_LENGTH,
  addSticker,
  createBoothEditorConfig,
  createStickerId,
  fitCaptionSize,
  formatBoothDate,
  moveSticker,
  normalizeCaption,
  removeSticker,
  toDateValue,
  updateSticker,
} from "./editor.ts";

const TODAY = new Date(2026, 10, 3);

describe("createBoothEditorConfig", () => {
  it("starts on the border, with today's date and the default frame", () => {
    const config = createBoothEditorConfig(DEFAULT_BORDER_KEY, TODAY);

    assert.equal(config.borderKey, DEFAULT_BORDER_KEY);
    assert.equal(config.backgroundKey, null);
    assert.deepEqual(config.stickers, []);
    assert.equal(config.caption, "");
    assert.equal(config.showDate, true);
    assert.equal(config.date, "2026-11-03");
    assert.ok(config.spacing > 0);
    assert.ok(config.borderWidth > 0);
  });
});

describe("toDateValue", () => {
  it("pads a local date", () => {
    assert.equal(toDateValue(new Date(2026, 0, 4)), "2026-01-04");
    assert.equal(toDateValue(new Date(2026, 11, 24)), "2026-12-24");
  });
});

describe("formatBoothDate", () => {
  it("prints a readable day, month and year", () => {
    assert.equal(formatBoothDate("2026-11-03"), "3 November 2026");
    assert.equal(formatBoothDate("2025-02-14"), "14 February 2025");
  });

  it("refuses malformed or impossible dates", () => {
    assert.equal(formatBoothDate(""), "");
    assert.equal(formatBoothDate("3 November 2026"), "");
    assert.equal(formatBoothDate("2026-13-01"), "");
    assert.equal(formatBoothDate("2026-02-30"), "");
    assert.equal(formatBoothDate("2026-00-10"), "");
  });

  it("round-trips every month without a timezone shift", () => {
    for (let month = 1; month <= 12; month += 1) {
      const iso = `2026-${String(month).padStart(2, "0")}-15`;
      const formatted = formatBoothDate(iso);

      assert.match(formatted, /^15 [A-Z][a-z]+ 2026$/);
    }
  });
});

describe("normalizeCaption", () => {
  it("collapses repeated spaces and trims the start", () => {
    assert.equal(normalizeCaption("  Our   Little  Moments"), "Our Little Moments");
  });

  it("keeps a trailing space while the visitor is typing", () => {
    assert.equal(normalizeCaption("Just us "), "Just us ");
  });

  it("enforces the caption limit", () => {
    const long = "a".repeat(MAX_CAPTION_LENGTH + 20);

    assert.equal(normalizeCaption(long).length, MAX_CAPTION_LENGTH);
  });
});

describe("fitCaptionSize", () => {
  it("keeps the base size when the caption fits", () => {
    assert.equal(fitCaptionSize("Just us", 35, 600), 35);
  });

  it("shrinks a long caption to the plate", () => {
    const size = fitCaptionSize("a".repeat(MAX_CAPTION_LENGTH), 35, 300);

    assert.ok(size < 35);
    assert.ok(size >= 10);
  });

  it("does nothing without text or room", () => {
    assert.equal(fitCaptionSize("", 35, 600), 35);
    assert.equal(fitCaptionSize("hi", 0, 600), 0);
    assert.equal(fitCaptionSize("hi", 35, 0), 35);
  });
});

describe("backgrounds", () => {
  it("offers the curated swatches with unique keys and colours", () => {
    assert.equal(BACKGROUND_KEYS.length, 6);

    const keys = new Set(BACKGROUND_KEYS);
    const colours = new Set(BACKGROUND_KEYS.map((key) => backgroundColour(key)));

    assert.equal(keys.size, BACKGROUND_KEYS.length);
    assert.equal(colours.size, BACKGROUND_KEYS.length);

    for (const key of BACKGROUND_KEYS) {
      assert.match(backgroundColour(key) ?? "", /^#[0-9A-F]{6}$/i);
      assert.ok(isBackgroundKey(key));
    }
  });

  it("keeps the border's paper when no swatch is chosen", () => {
    assert.equal(backgroundColour(null), null);
    assert.equal(isBackgroundKey("not-a-colour"), false);
  });
});

describe("stickers", () => {
  it("adds stickers at different spots up to the limit", () => {
    let config = createBoothEditorConfig(DEFAULT_BORDER_KEY, TODAY);
    const spots = [];

    for (let index = 0; index < 12; index += 1) {
      const before = config.stickers.length;
      config = addSticker(config, "heart", `sticker-${index}`);

      if (config.stickers.length > before) {
        const sticker = config.stickers[config.stickers.length - 1];
        spots.push(`${sticker.x}:${sticker.y}`);
      }
    }

    assert.equal(config.stickers.length, 10, "the page holds ten stickers");
    assert.equal(new Set(spots).size, 10, "each new sticker lands somewhere new");
  });

  it("moves a sticker by fraction and clamps to the page", () => {
    const config = addSticker(
      createBoothEditorConfig(DEFAULT_BORDER_KEY, TODAY),
      "bow",
      "a",
    );
    const moved = moveSticker(config, "a", 2, -1);
    const sticker = moved.stickers[0];

    assert.equal(sticker.x, 1);
    assert.equal(sticker.y, 0);
    assert.equal(moveSticker(moved, "a", Number.NaN, 0.5).stickers[0].x, 0.5);
  });

  it("clamps size and rotation", () => {
    const config = addSticker(
      createBoothEditorConfig(DEFAULT_BORDER_KEY, TODAY),
      "star",
      "a",
    );
    const huge = updateSticker(config, "a", { size: 9, rotate: 900 }).stickers[0];
    const tiny = updateSticker(config, "a", { size: 0, rotate: -900 }).stickers[0];

    assert.equal(huge.size, MAX_STICKER_SIZE);
    assert.equal(huge.rotate, 180);
    assert.equal(tiny.size, MIN_STICKER_SIZE);
    assert.equal(tiny.rotate, -180);
  });

  it("updates only the named sticker", () => {
    let config = addSticker(
      createBoothEditorConfig(DEFAULT_BORDER_KEY, TODAY),
      "bunny",
      "a",
    );

    config = addSticker(config, "daisy", "b");
    config = removeSticker(config, "a");

    assert.deepEqual(config.stickers.map((sticker) => sticker.id), ["b"]);
    assert.equal(config.stickers[0].sticker, "daisy");
  });

  it("creates unique sticker ids", () => {
    const first = createStickerId();
    const second = createStickerId();

    assert.ok(first.startsWith("sticker-"));
    assert.notEqual(first, second);
  });
});
