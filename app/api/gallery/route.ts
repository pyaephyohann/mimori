import { loadGalleryPhotos } from "@/lib/gallery-photos";

/**
 * /api/gallery — the gallery's photos for client pickers.
 *
 * The collections page, the collection dialogs and the widget photo step read
 * their pictures here, so every picker offers exactly the photos the `/gallery`
 * page shows. A failed query answers 503 rather than an empty list: "the
 * gallery could not be loaded" and "the gallery is empty" are different states.
 */
const noStore = { headers: { "cache-control": "no-store" } };

export async function GET() {
  const { photos, failed } = await loadGalleryPhotos();

  if (failed) {
    return Response.json(
      { error: "The gallery could not be loaded right now." },
      { status: 503 },
    );
  }

  return Response.json({ photos }, noStore);
}
