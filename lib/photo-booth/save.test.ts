import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBoothEditorConfig, type BoothEditorConfig } from "./editor.ts";
import {
  BoothSaveError,
  boothPrintSignature,
  createBoothSaveCache,
  saveBoothSession,
  updateBoothSession,
} from "./save.ts";
import type { BoothSessionSummary } from "./summary.ts";

function config(overrides: Partial<BoothEditorConfig> = {}): BoothEditorConfig {
  return { ...createBoothEditorConfig("vintage-film", new Date(2026, 10, 3)), ...overrides };
}

const SHOT_IDS = ["shot-a", "shot-b", "shot-c", "shot-d"];

const SIGNATURE = boothPrintSignature({
  photoCount: 4,
  layout: "strip",
  config: config({ caption: "Just Us Two" }),
  shotIds: SHOT_IDS,
});

const SUMMARY: BoothSessionSummary = {
  id: "session-1",
  createdAt: "2026-11-03T10:00:00.000Z",
  photoCount: 4,
  layout: "strip",
  borderKey: "vintage-film",
  caption: "Just Us Two",
  printDate: "2026-11-03",
  print: {
    id: "print-2",
    src: "https://res.cloudinary.com/demo/image/upload/mimori/gallery/print-2.jpg",
  },
  shotCount: 4,
  shotThumbs: [],
};

const PRINT = new Blob(["print"], { type: "image/jpeg" });

type FetchCall = { url: string; method: string; body: Record<string, unknown> };

async function withFetch<T>(
  answer: (call: FetchCall) => Response | Promise<Response>,
  run: (calls: FetchCall[]) => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    };

    calls.push(call);

    return answer(call);
  }) as typeof fetch;

  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

function updateInput(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "session-1",
    photoCount: 4 as const,
    layout: "strip" as const,
    shotIds: SHOT_IDS,
    config: config({ caption: "Just Us Two" }),
    print: PRINT,
    cache: createBoothSaveCache({ signature: SIGNATURE, photoId: "print-2" }),
    ...overrides,
  };
}

describe("boothPrintSignature", () => {
  it("matches only the exact photos and settings", () => {
    const base = { photoCount: 4 as const, layout: "strip" as const, shotIds: SHOT_IDS };

    assert.equal(
      boothPrintSignature({ ...base, config: config({ caption: "Just Us Two" }) }),
      SIGNATURE,
    );

    const changes: Partial<BoothEditorConfig>[] = [
      { caption: "Forever" },
      { borderKey: "lovely-hearts" },
      { backgroundKey: "cream" },
      { spacing: 30 },
      { borderWidth: 80 },
      { showDate: false },
      { date: "2026-11-04" },
      {
        stickers: [
          { id: "s1", sticker: "bow", x: 0.2, y: 0.3, size: 0.14, rotate: 0 },
        ],
      },
    ];

    for (const change of changes) {
      assert.notEqual(
        boothPrintSignature({ ...base, config: config(change) }),
        SIGNATURE,
        `${JSON.stringify(change)} should make a different print`,
      );
    }

    assert.notEqual(
      boothPrintSignature({
        ...base,
        config: config({ caption: "Just Us Two" }),
        shotIds: ["shot-a", "shot-b", "shot-c", "shot-x"],
      }),
      SIGNATURE,
    );

    assert.notEqual(
      boothPrintSignature({
        photoCount: 6,
        layout: "collage",
        config: config({ caption: "Just Us Two" }),
        shotIds: SHOT_IDS,
      }),
      SIGNATURE,
    );
  });
});

describe("createBoothSaveCache", () => {
  it("starts empty, and can be primed with a saved session's print", () => {
    const empty = createBoothSaveCache();
    const primed = createBoothSaveCache({ signature: SIGNATURE, photoId: "print-2" });

    assert.equal(empty.print, null);
    assert.equal(empty.shots.size, 0);
    assert.deepEqual(primed.print, { signature: SIGNATURE, photoId: "print-2" });
  });
});

describe("updateBoothSession", () => {
  it("patches the existing session and reuses its unchanged print", async () => {
    const result = await withFetch(
      () => Response.json({ session: SUMMARY }),
      async (calls) => {
        const saved = await updateBoothSession(updateInput());

        assert.equal(calls.length, 1, "no upload: the print is already stored");
        assert.equal(calls[0].url, "/api/photo-booth/session-1");
        assert.equal(calls[0].method, "PATCH");
        assert.equal(calls[0].body.printPhotoId, "print-2");
        assert.equal(calls[0].body.caption, "Just Us Two");
        assert.equal("shotPhotoIds" in calls[0].body, false);

        return saved;
      },
    );

    assert.equal(result.sessionId, "session-1");
    assert.equal(result.print.id, "print-2");
    assert.equal(result.summary.shotCount, 4);
  });

  it("sends a replacement print when the composition changed", async () => {
    const cache = createBoothSaveCache();

    // Without a browser XHR the upload cannot run, so this asserts the failure
    // path: nothing is patched before the new print is stored.
    const failure = await withFetch(
      () => Response.json({ session: SUMMARY }),
      async (calls) => {
        const error = await updateBoothSession(
          updateInput({
            cache,
            config: config({ caption: "Something new" }),
          }),
        ).catch((cause: unknown) => cause);

        assert.equal(calls.length, 0, "the session is not written without a print");
        assert.ok(error instanceof BoothSaveError);
        assert.match((error as Error).message, /new print could not be uploaded/);

        return error;
      },
    );

    assert.ok(failure instanceof BoothSaveError);
    assert.equal(cache.print, null, "a failed upload is never cached");
  });

  it("reports a rejected edit and keeps the work available for a retry", async () => {
    const cache = createBoothSaveCache({ signature: SIGNATURE, photoId: "print-2" });

    const error = await withFetch(
      () =>
        Response.json(
          { error: "A gallery photo cannot be one of the print's captures." },
          { status: 400 },
        ),
      async () => {
        const cause = await updateBoothSession(updateInput({ cache })).catch(
          (thrown: unknown) => thrown,
        );

        return cause;
      },
    );

    assert.ok(error instanceof BoothSaveError);
    assert.match(
      (error as Error).message,
      /gallery photo cannot be one of the print's captures/,
    );
    assert.deepEqual(
      cache.print,
      { signature: SIGNATURE, photoId: "print-2" },
      "the stored print is kept for the next attempt",
    );
  });

  it("treats an unreadable confirmation as a failure, not a save", async () => {
    const error = await withFetch(
      () => Response.json({}),
      async () =>
        updateBoothSession(updateInput()).catch((thrown: unknown) => thrown),
    );

    assert.ok(error instanceof BoothSaveError);
    assert.match((error as Error).message, /confirmation could not be read/);
  });

  it("never reports a multi-session write for one edit", async () => {
    const calls = await withFetch(
      () => Response.json({ session: SUMMARY }),
      async (seen) => {
        await updateBoothSession(updateInput());

        return seen;
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(
      calls.filter((call) => call.url === "/api/photo-booth").length,
      0,
      "editing must not create a second session",
    );
  });
});

describe("saveBoothSession", () => {
  it("refuses to save a print whose photos are not all there", async () => {
    const error = await withFetch(
      () => Response.json({ session: SUMMARY }, { status: 201 }),
      async (calls) => {
        const cause = await saveBoothSession({
          photoCount: 4,
          layout: "strip",
          config: config(),
          shots: [{ id: "shot-a", blob: new Blob(["a"]) }],
          print: PRINT,
          cache: createBoothSaveCache(),
        }).catch((thrown: unknown) => thrown);

        assert.equal(calls.length, 0);

        return cause;
      },
    );

    assert.ok(error instanceof BoothSaveError);
    assert.match((error as Error).message, /needs 4 photos/);
  });

  it("refuses an empty finished print", async () => {
    const shots = SHOT_IDS.map((id) => ({ id, blob: new Blob([id]) }));

    const error = await saveBoothSession({
      photoCount: 4,
      layout: "strip",
      config: config(),
      shots,
      print: new Blob([]),
      cache: createBoothSaveCache(),
    }).catch((thrown: unknown) => thrown);

    assert.ok(error instanceof BoothSaveError);
    assert.match((error as Error).message, /could not be prepared/);
  });
});
