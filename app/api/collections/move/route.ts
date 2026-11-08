import { collectionErrorResponse } from "@/lib/collections/http";
import { movePhotos } from "@/lib/collections/server";
import { parseMove } from "@/lib/collections/validate";
import { loadPhotoIdSet } from "@/lib/gallery-photos";

/** Moves photos between collections in one transaction. */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    const parsed = parseMove(body, await loadPhotoIdSet());

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const result = await movePhotos(parsed.value);

    return Response.json(result);
  } catch (error) {
    return collectionErrorResponse(error, "POST /api/collections/move failed");
  }
}
