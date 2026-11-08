import { collectionErrorResponse } from "@/lib/collections/http";
import {
  deleteCollection,
  getCollection,
  updateCollection,
} from "@/lib/collections/server";
import { parseUpdate } from "@/lib/collections/validate";
import { loadPhotoIdSet } from "@/lib/gallery-photos";

type CollectionRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: CollectionRouteContext,
) {
  const { id } = await params;

  try {
    const collection = await getCollection(id);

    if (!collection) {
      return Response.json(
        { error: "That collection no longer exists." },
        { status: 404 },
      );
    }

    return Response.json(
      { collection },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return collectionErrorResponse(error, `GET /api/collections/${id} failed`);
  }
}

export async function PATCH(
  request: Request,
  { params }: CollectionRouteContext,
) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    const parsed = parseUpdate(body, await loadPhotoIdSet());

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const collection = await updateCollection(id, parsed.value);

    if (!collection) {
      return Response.json(
        { error: "That collection no longer exists." },
        { status: 404 },
      );
    }

    return Response.json({ collection });
  } catch (error) {
    return collectionErrorResponse(
      error,
      `PATCH /api/collections/${id} failed`,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: CollectionRouteContext,
) {
  const { id } = await params;

  try {
    const removed = await deleteCollection(id);

    if (!removed) {
      return Response.json(
        { error: "That collection no longer exists." },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return collectionErrorResponse(
      error,
      `DELETE /api/collections/${id} failed`,
    );
  }
}
