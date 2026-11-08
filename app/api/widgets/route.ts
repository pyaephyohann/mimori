import { loadPhotoIdSet } from "@/lib/gallery-photos";
import { notifyOtherDevices } from "@/lib/push/server";
import { createWidget, listWidgets } from "@/lib/widgets/server";
import { parseCreate } from "@/lib/widgets/validate";

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

  try {
    // Only photos that are actually in the gallery may be used in a widget.
    const parsed = parseCreate(body, await loadPhotoIdSet());

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const widget = await createWidget(parsed.value);

    // Created, so the other devices hear about it; edits stay quiet.
    notifyOtherDevices(request, "widget-added");

    return Response.json({ widget }, { status: 201 });
  } catch (error) {
    console.error("POST /api/widgets failed", error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}
