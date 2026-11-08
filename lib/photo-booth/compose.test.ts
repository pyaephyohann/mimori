import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BORDER_KEYS,
  DEFAULT_BORDER_KEY,
  getBorderTemplate,
} from "./borders.ts";
import { BOOTH_LAYOUTS, PHOTO_COUNTS } from "./catalog.ts";
import {
  CAPTION_HEIGHT,
  DEFAULT_SPACING,
  MAX_STICKER_SIZE,
  MAX_USER_STICKERS,
  MIN_STICKER_SIZE,
  composeBooth,
  type Rect,
  type StickerPlacement,
} from "./compose.ts";

/** True when two rectangles share any area; touching edges do not count. */
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function isInside(rect: Rect, outer: Rect): boolean {
  return (
    rect.x >= outer.x &&
    rect.y >= outer.y &&
    rect.x + rect.width <= outer.x + outer.width &&
    rect.y + rect.height <= outer.y + outer.height
  );
}

describe("composeBooth", () => {
  for (const layout of BOOTH_LAYOUTS) {
    for (const photoCount of PHOTO_COUNTS) {
      it(`makes ${photoCount} slots for a ${layout}`, () => {
        const geometry = composeBooth({
          photoCount,
          layout,
          borderKey: DEFAULT_BORDER_KEY,
        });

        assert.equal(geometry.slots.length, photoCount);

        for (const slot of geometry.slots) {
          assert.ok(slot.width > 0, "slot width is positive");
          assert.ok(slot.height > 0, "slot height is positive");
          assert.ok(isInside(slot, geometry.inner), "slot sits on the page");
        }
      });

      it(`never overlaps slots in a ${layout} of ${photoCount}`, () => {
        const { slots } = composeBooth({
          photoCount,
          layout,
          borderKey: DEFAULT_BORDER_KEY,
        });

        for (let a = 0; a < slots.length; a += 1) {
          for (let b = a + 1; b < slots.length; b += 1) {
            assert.ok(
              !overlaps(slots[a], slots[b]),
              `slots ${a} and ${b} overlap`,
            );
          }
        }
      });

      it(`is deterministic for a ${layout} of ${photoCount}`, () => {
        const config = {
          photoCount,
          layout,
          borderKey: DEFAULT_BORDER_KEY,
        } as const;

        assert.deepEqual(composeBooth(config), composeBooth(config));
      });

      it(`keeps the composition boundaries valid for a ${layout} of ${photoCount}`, () => {
        const geometry = composeBooth({
          photoCount,
          layout,
          borderKey: DEFAULT_BORDER_KEY,
        });

        assert.ok(geometry.width > 0);
        assert.ok(geometry.height > 0);
        assert.deepEqual(geometry.frame, {
          x: 0,
          y: 0,
          width: geometry.width,
          height: geometry.height,
        });
        assert.ok(isInside(geometry.inner, geometry.frame));
        assert.ok(geometry.inner.x > 0);
        assert.ok(geometry.inner.y > 0);

        for (const decoration of geometry.decorations) {
          assert.ok(decoration.size > 0);
          assert.ok(decoration.x >= 0);
          assert.ok(decoration.y >= 0);
          assert.ok(decoration.x + decoration.size <= geometry.width);
          assert.ok(decoration.y + decoration.size <= geometry.height);
        }

        for (const slot of geometry.slots) {
          for (const key of ["x", "y", "width", "height"] as const) {
            assert.ok(
              Number.isInteger(slot[key]),
              `${key} is a whole composition unit`,
            );
          }
        }
      });
    }
  }

  it("makes a tall strip for every count", () => {
    for (const photoCount of PHOTO_COUNTS) {
      const geometry = composeBooth({
        photoCount,
        layout: "strip",
        borderKey: DEFAULT_BORDER_KEY,
      });

      assert.ok(
        geometry.height > geometry.width,
        `a ${photoCount}-photo strip should be taller than it is wide`,
      );
    }
  });

  it("pairs a six-photo strip into two columns", () => {
    const six = composeBooth({
      photoCount: 6,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
    });
    const four = composeBooth({
      photoCount: 4,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
    });

    assert.ok(six.width > four.width, "six frames span two columns");
    assert.equal(six.slots[1].y, six.slots[0].y, "the first pair shares a row");
    assert.equal(six.slots[2].y, six.slots[0].y + six.slots[0].height + 18);
  });

  it("makes a square collage for every count", () => {
    for (const photoCount of PHOTO_COUNTS) {
      const geometry = composeBooth({
        photoCount,
        layout: "collage",
        borderKey: DEFAULT_BORDER_KEY,
      });

      assert.equal(geometry.width, geometry.height);
    }
  });

  it("adds the caption plate and spacing only when asked", () => {
    const withoutCaption = composeBooth({
      photoCount: 4,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      caption: false,
    });
    const withCaption = composeBooth({
      photoCount: 4,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      caption: true,
    });

    assert.equal(withoutCaption.caption, null);
    assert.ok(withCaption.caption);
    assert.equal(withCaption.height - withoutCaption.height, CAPTION_HEIGHT + DEFAULT_SPACING);
    assert.ok(isInside(withCaption.caption, withCaption.inner));
    assert.equal(
      withCaption.caption.y,
      withCaption.slots[3].y + withCaption.slots[3].height + DEFAULT_SPACING,
    );
  });

  it("keeps a collage caption inside the page", () => {
    for (const photoCount of PHOTO_COUNTS) {
      const geometry = composeBooth({
        photoCount,
        layout: "collage",
        borderKey: DEFAULT_BORDER_KEY,
        caption: true,
      });

      assert.ok(geometry.caption);
      assert.ok(isInside(geometry.caption, geometry.inner));
    }
  });

  it("clamps a silly border thickness and spacing", () => {
    const huge = composeBooth({
      photoCount: 2,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      borderWidth: 5_000,
      spacing: 5_000,
    });

    assert.equal(huge.slots[0].x, 96);
    assert.equal(huge.frame.width, 640 + 96 * 2);

    const tiny = composeBooth({
      photoCount: 2,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      borderWidth: -10,
      spacing: -4,
    });

    assert.equal(tiny.slots[0].x, 24);
    assert.equal(tiny.slots[1].y - (tiny.slots[0].y + tiny.slots[0].height), 8);
  });

  it("places the caption and date text boxes inside the plate", () => {
    for (const layout of BOOTH_LAYOUTS) {
      for (const photoCount of PHOTO_COUNTS) {
        const geometry = composeBooth({
          photoCount,
          layout,
          borderKey: DEFAULT_BORDER_KEY,
          caption: true,
        });

        assert.ok(geometry.caption);
        assert.ok(geometry.captionText);
        assert.ok(isInside(geometry.captionText.title, geometry.caption));
        assert.ok(isInside(geometry.captionText.date, geometry.caption));
        assert.ok(geometry.captionText.title.fontSize > 0);
        assert.ok(geometry.captionText.date.fontSize > 0);
        assert.ok(
          geometry.captionText.title.y + geometry.captionText.title.height <=
            geometry.captionText.date.y,
          "the title sits above the date",
        );
      }
    }
  });

  it("has no text boxes without a caption plate", () => {
    const geometry = composeBooth({
      photoCount: 4,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      caption: false,
    });

    assert.equal(geometry.caption, null);
    assert.equal(geometry.captionText, null);
  });

  it("keeps the frame paper unless a colour is chosen", () => {
    for (const borderKey of BORDER_KEYS) {
      const template = getBorderTemplate(borderKey);
      const plain = composeBooth({
        photoCount: 4,
        layout: "strip",
        borderKey,
      });

      assert.equal(plain.background, template.frame);
    }

    const painted = composeBooth({
      photoCount: 4,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      background: "#FFF4C9",
    });
    const invalid = composeBooth({
      photoCount: 4,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      background: "url(javascript:alert(1))",
    });

    assert.equal(painted.background, "#FFF4C9");
    assert.equal(
      invalid.background,
      getBorderTemplate(DEFAULT_BORDER_KEY).frame,
    );
  });

  it("places user stickers inside the composition", () => {
    const stickers: StickerPlacement[] = [
      { id: "a", sticker: "heart", x: 0, y: 0, size: 0.2, rotate: -10 },
      { id: "b", sticker: "bow", x: 1, y: 1, size: 0.2, rotate: 10 },
      { id: "c", sticker: "star", x: 0.5, y: 0.5, size: 0.2, rotate: 0 },
    ];

    for (const layout of BOOTH_LAYOUTS) {
      const geometry = composeBooth({
        photoCount: 4,
        layout,
        borderKey: DEFAULT_BORDER_KEY,
        stickers,
      });

      assert.equal(geometry.stickers.length, 3);

      for (const sticker of geometry.stickers) {
        assert.ok(sticker.side > 0);
        assert.ok(sticker.left >= 0);
        assert.ok(sticker.top >= 0);
        assert.ok(sticker.left + sticker.side <= geometry.width);
        assert.ok(sticker.top + sticker.side <= geometry.height);
        assert.ok(sticker.glyph.length > 0);
      }
    }
  });

  it("limits stickers and clamps their size", () => {
    const many: StickerPlacement[] = Array.from(
      { length: MAX_USER_STICKERS + 5 },
      (_unused, index) => ({
        id: `s-${index}`,
        sticker: "daisy",
        x: 0.5,
        y: 0.5,
        size: 5,
        rotate: 0,
      }),
    );
    const geometry = composeBooth({
      photoCount: 2,
      layout: "collage",
      borderKey: DEFAULT_BORDER_KEY,
      stickers: many,
    });

    assert.equal(geometry.stickers.length, MAX_USER_STICKERS);
    assert.equal(
      geometry.stickers[0].side,
      Math.round(geometry.width * MAX_STICKER_SIZE),
    );

    const tiny = composeBooth({
      photoCount: 2,
      layout: "collage",
      borderKey: DEFAULT_BORDER_KEY,
      stickers: [{ id: "t", sticker: "bow", x: 0.5, y: 0.5, size: 0, rotate: 0 }],
    });

    assert.equal(
      tiny.stickers[0].side,
      Math.round(tiny.width * MIN_STICKER_SIZE),
    );
  });

  it("ignores a sticker key that is not in the registry", () => {
    const geometry = composeBooth({
      photoCount: 2,
      layout: "strip",
      borderKey: DEFAULT_BORDER_KEY,
      stickers: [
        {
          id: "bad",
          sticker: "nope" as StickerPlacement["sticker"],
          x: 0.5,
          y: 0.5,
          size: 0.14,
          rotate: 0,
        },
      ],
    });

    assert.equal(geometry.stickers.length, 0);
  });

  it("keeps slots, caption and stickers valid at every spacing and thickness", () => {
    for (const layout of BOOTH_LAYOUTS) {
      for (const photoCount of PHOTO_COUNTS) {
        for (const [borderWidth, spacing] of [
          [24, 8],
          [56, 18],
          [96, 48],
        ]) {
          const geometry = composeBooth({
            photoCount,
            layout,
            borderKey: DEFAULT_BORDER_KEY,
            borderWidth,
            spacing,
            caption: true,
          });

          assert.equal(geometry.slots.length, photoCount);
          assert.ok(geometry.caption);
          assert.ok(geometry.captionText);
          assert.ok(isInside(geometry.captionText.date, geometry.inner));

          for (const slot of geometry.slots) {
            assert.ok(isInside(slot, geometry.inner));
            assert.ok(!overlaps(slot, geometry.caption));
          }

          for (let a = 0; a < geometry.slots.length; a += 1) {
            for (let b = a + 1; b < geometry.slots.length; b += 1) {
              assert.ok(!overlaps(geometry.slots[a], geometry.slots[b]));
            }
          }
        }
      }
    }
  });

  it("places a decoration for every template entry", () => {
    for (const borderKey of BORDER_KEYS) {
      const geometry = composeBooth({
        photoCount: 4,
        layout: "strip",
        borderKey,
      });

      assert.ok(
        geometry.decorations.length > 0,
        `${borderKey} should carry its own decorations`,
      );
    }
  });
});
