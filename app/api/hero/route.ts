import { parseHeroReplacement } from "@/lib/hero/slots";
import {
  HeroSourceError,
  HeroTitleError,
  readHero,
  replaceHeroImage,
} from "@/lib/hero/server";

/**
 * /api/hero — the home page carousel's eight slots.
 *
 * GET lists every slot as it currently looks, empty ones included. POST fills
 * one slot with a gallery photo and a title; the image URL is resolved on the
 * server from the photo record, so the client sends ids and text only.
 */

const STORE_UNAVAILABLE = "The carousel photo could not be saved right now.";

const noStore = { headers: { "cache-control": "no-store" } };

export async function GET() {
  try {
    const { slots, assignments } = await readHero();

    return Response.json(
      {
        slots,
        assigned: assignments.map(({ slotId, photoId }) => ({ slotId, photoId })),
      },
      noStore,
    );
  } catch (error) {
    console.error("GET /api/hero failed", error);

    // Say so rather than pretending every slot is empty.
    return Response.json(
      { error: "The carousel could not be loaded right now." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = parseHeroReplacement(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { slots, assignments } = await replaceHeroImage(
      parsed.value.slotId,
      parsed.value.sourceId,
      parsed.value.title,
    );

    return Response.json(
      {
        slots,
        assigned: assignments.map(({ slotId, photoId }) => ({ slotId, photoId })),
      },
      noStore,
    );
  } catch (error) {
    if (error instanceof HeroTitleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof HeroSourceError) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    console.error("POST /api/hero failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}
