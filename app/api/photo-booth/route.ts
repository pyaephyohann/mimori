import {
  BoothDuplicateError,
  BoothPhotoError,
  createBoothSession,
  listBoothSessions,
} from "@/lib/photo-booth/server";
import { parseBoothSessionInput } from "@/lib/photo-booth/session";

/**
 * /api/photo-booth — saved photobooth sessions.
 *
 * POST saves one session after validating both its settings and the photos it
 * references; GET lists the metadata Phase 5 needs to offer reopening. Mimori
 * has no accounts (D-013), so there is no ownership check here — the same
 * exposure rules as the rest of the application protect the endpoint.
 */
const STORE_UNAVAILABLE = "The photobooth store is unavailable right now.";

const noStore = { headers: { "cache-control": "no-store" } };

export async function GET() {
  try {
    const sessions = await listBoothSessions();

    return Response.json({ sessions }, noStore);
  } catch (error) {
    console.error("GET /api/photo-booth failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = parseBoothSessionInput(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const session = await createBoothSession(parsed.value);

    return Response.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof BoothPhotoError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof BoothDuplicateError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    console.error("POST /api/photo-booth failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}
