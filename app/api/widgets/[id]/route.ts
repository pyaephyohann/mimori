import { loadPhotoIdSet } from "@/lib/gallery-photos";
import { notifyOtherDevices } from "@/lib/push/server";
import {
  deleteWidget,
  getWidget,
  updateWidget,
} from "@/lib/widgets/server";
import { parseUpdate, parseZ } from "@/lib/widgets/validate";

const STORE_UNAVAILABLE = "The widget store is unavailable right now.";

type WidgetRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: WidgetRouteContext) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    const current = await getWidget(id);

    if (!current) {
      return Response.json({ error: "That widget no longer exists." }, { status: 404 });
    }

    const parsed = parseUpdate(body, current.kind, await loadPhotoIdSet());

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const z =
      typeof body === "object" && body !== null && "z" in body
        ? parseZ((body as { z?: unknown }).z)
        : undefined;

    const widget = await updateWidget(id, parsed.value, z);

    if (!widget) {
      return Response.json({ error: "That widget no longer exists." }, { status: 404 });
    }

    return Response.json({ widget });
  } catch (error) {
    console.error(`PATCH /api/widgets/${id} failed`, error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  { params }: WidgetRouteContext,
) {
  const { id } = await params;

  try {
    const removed = await deleteWidget(id);

    if (!removed) {
      return Response.json({ error: "That widget no longer exists." }, { status: 404 });
    }

    // Removed, so the other devices hear about it.
    notifyOtherDevices(request, "widget-removed");

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`DELETE /api/widgets/${id} failed`, error);

    return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
  }
}
