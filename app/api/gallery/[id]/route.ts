import { getPrisma } from "@/lib/db";
import {
  GalleryPhotoInUseError,
  GalleryPhotoNotFoundError,
  GalleryStorageUnavailableError,
  deleteGalleryPhoto,
} from "@/lib/gallery-delete";
import { GALLERY_PHOTO_KIND, toGalleryPhoto } from "@/lib/gallery-source";
import { validatePhotoTitleEdit } from "@/lib/photo-upload";

/**
 * /api/gallery/[id] — one gallery photo.
 *
 * PATCH renames it. Only the title (`caption`) changes. The image, its
 * Cloudinary `publicId`, URL and other metadata are never touched, and the
 * update is limited to a `GALLERY` row with this id, so booth photos and other
 * photos are unaffected.
 *
 * DELETE removes it for good: the row, its Cloudinary asset and its references
 * in collections, widgets and the carousel. The body is never read — the id in
 * the path is the only input, and the public id comes from the row itself.
 */

type GalleryPhotoRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: GalleryPhotoRouteContext,
) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const title =
    typeof body === "object" && body !== null && "title" in body
      ? validatePhotoTitleEdit((body as { title: unknown }).title)
      : ({ ok: false, error: "A photo needs a title." } as const);

  if (!title.ok) {
    return Response.json({ error: title.error }, { status: 400 });
  }

  try {
    const result = await getPrisma().photo.updateMany({
      where: { id, kind: GALLERY_PHOTO_KIND },
      data: { caption: title.title },
    });

    if (result.count === 0) {
      return Response.json(
        { error: "That photo is no longer in the gallery." },
        { status: 404 },
      );
    }

    const row = await getPrisma().photo.findUnique({
      where: { id },
      select: { id: true, secureUrl: true, caption: true, fileName: true },
    });

    if (!row) {
      return Response.json(
        { error: "That photo is no longer in the gallery." },
        { status: 404 },
      );
    }

    return Response.json({ photo: toGalleryPhoto(row) });
  } catch (error) {
    console.error(`PATCH /api/gallery/${id} failed`, error);

    return Response.json(
      { error: "The title could not be saved right now. Try again." },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: GalleryPhotoRouteContext,
) {
  const { id } = await params;

  try {
    const result = await deleteGalleryPhoto(id);

    // A warning means the photo is gone from the gallery but its file could not
    // be removed; the client says so instead of reporting a clean deletion.
    return Response.json({ deleted: true, warning: result.warning });
  } catch (error) {
    if (error instanceof GalleryPhotoNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof GalleryPhotoInUseError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof GalleryStorageUnavailableError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error(`DELETE /api/gallery/${id} failed`, error);

    return Response.json(
      { error: "That photo could not be deleted right now. Try again." },
      { status: 503 },
    );
  }
}
