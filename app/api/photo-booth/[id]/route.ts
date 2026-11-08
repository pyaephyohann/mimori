import {
  BoothNotFoundError,
  BoothPhotoError,
  getBoothSession,
  updateBoothSession,
} from "@/lib/photo-booth/server";
import { parseBoothUpdateInput } from "@/lib/photo-booth/session";

/**
 * /api/photo-booth/[id] — one saved session.
 *
 * GET returns its settings, its captures in print order and its finished print,
 * all as ids and delivery URLs, which is everything the editor needs to reopen
 * it. PATCH writes an edit: new settings and a replacement print. The captures,
 * their order and the print's shape are read from the row and cannot be changed
 * through this endpoint.
 */

type BoothRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: BoothRouteContext) {
  const { id } = await params;

  try {
    const session = await getBoothSession(id);

    if (!session) {
      return Response.json(
        { error: "That photobooth session no longer exists." },
        { status: 404 },
      );
    }

    return Response.json(
      { session },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(`GET /api/photo-booth/${id} failed`, error);

    return Response.json(
      { error: "The photobooth store is unavailable right now." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request, { params }: BoothRouteContext) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = parseBoothUpdateInput(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const session = await updateBoothSession(id, parsed.value);

    return Response.json({ session }, { status: 200 });
  } catch (error) {
    if (error instanceof BoothNotFoundError) {
      return Response.json(
        { error: "That photobooth session no longer exists." },
        { status: 404 },
      );
    }

    if (error instanceof BoothPhotoError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error(`PATCH /api/photo-booth/${id} failed`, error);

    return Response.json(
      { error: "The photobooth store is unavailable right now." },
      { status: 503 },
    );
  }
}
