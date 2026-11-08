import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BOOTH_PRINT_KIND,
  BOOTH_SHOT_KIND,
  LEGACY_BOOTH_PRINT_KIND,
  parseBoothSessionInput,
  parseBoothUpdateInput,
  validateSessionPhotos,
} from "./session.ts";

const SHOTS = [
  "shot-a",
  "shot-b",
  "shot-c",
  "shot-d",
  "shot-e",
  "shot-f",
];

/** The four captures a default print holds. */
const FOUR = SHOTS.slice(0, 4);

function body(overrides: Record<string, unknown> = {}) {
  return {
    photoCount: 4,
    layout: "strip",
    borderKey: "lovely-hearts",
    backgroundKey: null,
    caption: "  Our Little Moments  ",
    showDate: true,
    printDate: "2026-11-03",
    spacing: 18,
    borderWidth: 56,
    stickers: [],
    printPhotoId: "print-1",
    shotPhotoIds: [...FOUR],
    ...overrides,
  };
}

const booth = (id: string) => ({ id, kind: BOOTH_SHOT_KIND });
const print = (id: string) => ({ id, kind: BOOTH_PRINT_KIND });
const legacyPrint = (id: string) => ({ id, kind: LEGACY_BOOTH_PRINT_KIND });

describe("parseBoothSessionInput", () => {
  it("accepts a complete session and trims its caption", () => {
    const parsed = parseBoothSessionInput(body());

    assert.equal(parsed.ok, true);

    if (!parsed.ok) {
      return;
    }

    assert.equal(parsed.value.caption, "Our Little Moments");
    assert.deepEqual(parsed.value.shotPhotoIds, FOUR);
    assert.equal(parsed.value.backgroundKey, null);
    assert.equal(parsed.value.printDate, "2026-11-03");
  });

  it("defaults an omitted date setting to showing the session's date", () => {
    const parsed = parseBoothSessionInput(body({ showDate: undefined }));

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.value.showDate, true);
    }
  });

  it("drops the printed date when the date is hidden", () => {
    const parsed = parseBoothSessionInput(
      body({ showDate: false, printDate: "2026-11-03" }),
    );

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.value.printDate, null);
    }
  });

  it("rejects a body that is not an object", () => {
    for (const value of [null, "session", 4, []]) {
      assert.equal(parseBoothSessionInput(value).ok, false);
    }
  });

  it("accepts only the supported photo counts", () => {
    for (const count of [2, 3, 4, 6]) {
      const ids = SHOTS.slice(0, count);
      const parsed = parseBoothSessionInput(
        body({ photoCount: count, shotPhotoIds: ids }),
      );

      assert.equal(parsed.ok, true, `${count} photos should be valid`);
    }

    for (const count of [0, 1, 5, 7, "4", null]) {
      assert.equal(parseBoothSessionInput(body({ photoCount: count })).ok, false);
    }
  });

  it("rejects unknown layouts, borders and papers", () => {
    assert.equal(parseBoothSessionInput(body({ layout: "grid" })).ok, false);
    assert.equal(parseBoothSessionInput(body({ borderKey: "sparkles" })).ok, false);
    assert.equal(
      parseBoothSessionInput(body({ backgroundKey: "neon" })).ok,
      false,
    );
  });

  it("accepts a paper swatch from the catalogue", () => {
    const parsed = parseBoothSessionInput(body({ backgroundKey: "lavender" }));

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.value.backgroundKey, "lavender");
    }
  });

  it("rejects a caption that is too long", () => {
    assert.equal(
      parseBoothSessionInput(body({ caption: "a".repeat(49) })).ok,
      false,
    );
    assert.equal(
      parseBoothSessionInput(body({ caption: "   " })).ok,
      true,
      "an empty caption is allowed",
    );
  });

  it("rejects an impossible date but accepts a real one", () => {
    assert.equal(
      parseBoothSessionInput(body({ printDate: "2026-02-30" })).ok,
      false,
    );
    assert.equal(
      parseBoothSessionInput(body({ printDate: "3 November 2026" })).ok,
      false,
    );
    assert.equal(
      parseBoothSessionInput(body({ printDate: "2024-02-29" })).ok,
      true,
    );
    assert.equal(parseBoothSessionInput(body({ printDate: "" })).ok, true);
  });

  it("rejects spacing and border thickness outside the sliders' range", () => {
    assert.equal(parseBoothSessionInput(body({ spacing: 7 })).ok, false);
    assert.equal(parseBoothSessionInput(body({ spacing: 49 })).ok, false);
    assert.equal(parseBoothSessionInput(body({ spacing: 17.5 })).ok, false);
    assert.equal(parseBoothSessionInput(body({ borderWidth: 23 })).ok, false);
    assert.equal(parseBoothSessionInput(body({ borderWidth: 97 })).ok, false);
    assert.equal(parseBoothSessionInput(body({ borderWidth: 96 })).ok, true);
  });

  it("accepts a sticker the editor can place", () => {
    const parsed = parseBoothSessionInput(
      body({
        stickers: [
          { id: "sticker-1", sticker: "bow", x: 0.2, y: 0.3, size: 0.14, rotate: -12 },
        ],
      }),
    );

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.value.stickers.length, 1);
      assert.equal(parsed.value.stickers[0].sticker, "bow");
    }
  });

  it("rejects malformed sticker layouts", () => {
    const cases: unknown[] = [
      "bow",
      [{ id: "", sticker: "bow", x: 0.2, y: 0.3, size: 0.14, rotate: 0 }],
      [{ id: "s1", sticker: "unicorn", x: 0.2, y: 0.3, size: 0.14, rotate: 0 }],
      [{ id: "s1", sticker: "bow", x: 1.4, y: 0.3, size: 0.14, rotate: 0 }],
      [{ id: "s1", sticker: "bow", x: 0.2, y: 0.3, size: 0.01, rotate: 0 }],
      [{ id: "s1", sticker: "bow", x: 0.2, y: 0.3, size: 0.14, rotate: 200 }],
      [
        { id: "s1", sticker: "bow", x: 0.2, y: 0.3, size: 0.14, rotate: 0 },
        { id: "s1", sticker: "heart", x: 0.4, y: 0.3, size: 0.14, rotate: 0 },
      ],
      Array.from({ length: 11 }, (_unused, index) => ({
        id: `s${index}`,
        sticker: "bow",
        x: 0.2,
        y: 0.3,
        size: 0.14,
        rotate: 0,
      })),
    ];

    for (const stickers of cases) {
      assert.equal(
        parseBoothSessionInput(body({ stickers })).ok,
        false,
        `${JSON.stringify(stickers)} should be rejected`,
      );
    }
  });

  it("rejects a shot count that does not match the print", () => {
    const parsed = parseBoothSessionInput(
      body({ shotPhotoIds: ["shot-a", "shot-b"] }),
    );

    assert.equal(parsed.ok, false);

    if (!parsed.ok) {
      assert.match(parsed.error, /holds 4 photos, but 2/);
    }
  });

  it("rejects a duplicate or missing capture id", () => {
    assert.equal(
      parseBoothSessionInput(
        body({ shotPhotoIds: ["shot-a", "shot-a", "shot-c", "shot-d"] }),
      ).ok,
      false,
    );
    assert.equal(
      parseBoothSessionInput(
        body({ shotPhotoIds: ["shot-a", "", "shot-c", "shot-d"] }),
      ).ok,
      false,
    );
  });

  it("rejects a print that is also one of its captures", () => {
    const parsed = parseBoothSessionInput(
      body({ printPhotoId: "shot-b" }),
    );

    assert.equal(parsed.ok, false);
  });

  it("rejects a missing print id", () => {
    assert.equal(parseBoothSessionInput(body({ printPhotoId: "" })).ok, false);
    assert.equal(parseBoothSessionInput(body({ printPhotoId: 42 })).ok, false);
  });
});

describe("validateSessionPhotos", () => {
  it("accepts booth captures and a booth print", () => {
    const shots = FOUR.map(booth);

    assert.equal(validateSessionPhotos(shots, print("print-1"), 4), null);
  });

  it("accepts a legacy gallery-kind print saved before the change", () => {
    const shots = FOUR.map(booth);

    assert.equal(validateSessionPhotos(shots, legacyPrint("print-1"), 4), null);
  });

  it("rejects a capture that is a gallery photo", () => {
    const shots = [legacyPrint("shot-a"), ...FOUR.slice(1).map(booth)];

    assert.match(
      validateSessionPhotos(shots, print("print-1"), 4) ?? "",
      /Only Photo Booth captures/,
    );
  });

  it("rejects a print of an unrelated kind", () => {
    const shots = FOUR.map(booth);

    assert.match(
      validateSessionPhotos(shots, { id: "print-1", kind: "OTHER" } as never, 4) ??
        "",
      /must be a Photo Booth print/,
    );
  });

  it("rejects a capture that no longer exists", () => {
    const shots = [null, ...FOUR.slice(1).map(booth)];

    assert.match(
      validateSessionPhotos(shots, print("print-1"), 4) ?? "",
      /could not be found/,
    );
  });

  it("rejects a print that no longer exists", () => {
    assert.match(
      validateSessionPhotos(FOUR.map(booth), null, 4) ?? "",
      /print could not be found/,
    );
  });

  it("rejects a count that does not match the print's setting", () => {
    assert.match(
      validateSessionPhotos(FOUR.map(booth), print("print-1"), 6) ?? "",
      /holds 6 photos, but 4/,
    );
  });

  it("accepts a six-photo print", () => {
    assert.equal(
      validateSessionPhotos(SHOTS.map(booth), print("print-1"), 6),
      null,
    );
  });
});

/** An edit never names photos: the session already owns them. */
function updateBody(overrides: Record<string, unknown> = {}) {
  return {
    borderKey: "flower-garden",
    backgroundKey: "cream",
    caption: "Forever Together",
    showDate: true,
    printDate: "2026-11-04",
    spacing: 20,
    borderWidth: 60,
    stickers: [],
    printPhotoId: "print-2",
    ...overrides,
  };
}

describe("parseBoothUpdateInput", () => {
  it("accepts a settings edit with a replacement print", () => {
    const parsed = parseBoothUpdateInput(updateBody());

    assert.equal(parsed.ok, true);

    if (!parsed.ok) {
      return;
    }

    assert.equal(parsed.value.borderKey, "flower-garden");
    assert.equal(parsed.value.backgroundKey, "cream");
    assert.equal(parsed.value.caption, "Forever Together");
    assert.equal(parsed.value.printPhotoId, "print-2");
    assert.equal(parsed.value.spacing, 20);
    assert.equal(parsed.value.borderWidth, 60);
  });

  it("refuses any attempt to change the session's photos", () => {
    const parsed = parseBoothUpdateInput(
      updateBody({ shotPhotoIds: ["shot-x", "shot-y"] }),
    );

    assert.equal(parsed.ok, false);

    if (!parsed.ok) {
      assert.match(parsed.error, /photos in a saved photobooth cannot be changed/);
    }
  });

  it("refuses a different photo count or layout", () => {
    assert.equal(parseBoothUpdateInput(updateBody({ photoCount: 6 })).ok, false);
    assert.equal(
      parseBoothUpdateInput(updateBody({ layout: "collage" })).ok,
      false,
    );
  });

  it("validates every edited setting", () => {
    assert.equal(
      parseBoothUpdateInput(updateBody({ borderKey: "sparkles" })).ok,
      false,
    );
    assert.equal(
      parseBoothUpdateInput(updateBody({ backgroundKey: "neon" })).ok,
      false,
    );
    assert.equal(
      parseBoothUpdateInput(updateBody({ caption: "a".repeat(49) })).ok,
      false,
    );
    assert.equal(
      parseBoothUpdateInput(updateBody({ printDate: "2026-02-30" })).ok,
      false,
    );
    assert.equal(parseBoothUpdateInput(updateBody({ spacing: 3 })).ok, false);
    assert.equal(
      parseBoothUpdateInput(updateBody({ borderWidth: 400 })).ok,
      false,
    );
    assert.equal(
      parseBoothUpdateInput(
        updateBody({
          stickers: [
            { id: "s1", sticker: "unicorn", x: 0.2, y: 0.3, size: 0.14, rotate: 0 },
          ],
        }),
      ).ok,
      false,
    );
  });

  it("requires a replacement print and trims the caption", () => {
    assert.equal(parseBoothUpdateInput(updateBody({ printPhotoId: "" })).ok, false);
    assert.equal(parseBoothUpdateInput(updateBody({ printPhotoId: 7 })).ok, false);

    const parsed = parseBoothUpdateInput(updateBody({ caption: "  Just Us  " }));

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.value.caption, "Just Us");
    }
  });

  it("drops the printed date when the date is hidden", () => {
    const parsed = parseBoothUpdateInput(
      updateBody({ showDate: false, printDate: "2026-11-04" }),
    );

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.value.printDate, null);
    }
  });

  it("rejects a body that is not an object", () => {
    for (const value of [null, "edit", 4, []]) {
      assert.equal(parseBoothUpdateInput(value).ok, false);
    }
  });
});
