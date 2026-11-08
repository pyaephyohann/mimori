import { collectionErrorResponse } from "@/lib/collections/http";
import { createCollection, listCollections } from "@/lib/collections/server";
import { parseCreate } from "@/lib/collections/validate";
import { loadPhotoIdSet } from "@/lib/gallery-photos";
import { notifyOtherDevices } from "@/lib/push/server";

export async function GET() {
  try {
    const collections = await listCollections();

    return Response.json(
      { collections },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return collectionErrorResponse(error, "GET /api/collections failed");
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    // Only photos that are actually in the gallery may be added, checked
    // against the photo table rather than a bundled list.
    const parsed = parseCreate(body, await loadPhotoIdSet());

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const collection = await createCollection(parsed.value);

    // Created, so the other devices hear about it; edits stay quiet.
    notifyOtherDevices(request, "collection-created");

    return Response.json({ collection }, { status: 201 });
  } catch (error) {
    return collectionErrorResponse(error, "POST /api/collections failed");
  }
}
