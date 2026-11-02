import { photos } from "@/lib/photos";
import { createWidget, listWidgets } from "@/lib/widgets/server";
import { parseCreate } from "@/lib/widgets/validate";

const allowedPhotoIds = new Set(photos.map((photo) => photo.id));

const STORE_UNAVAILABLE = "The widget store is unavailable right now.";

export async function GET() {
  try {
    const widgets = await listWidgets();

    return Response.json(
      { widgets },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/widgets failed", error);

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

  const parsed = parseCreate(body, allowedPhotoIds);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const widget = await createWidget(parsed.value);

    return Response.json({ widget }, { status: 201 });
  } catch (error) {
    console.error("POST /api/widgets failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}
