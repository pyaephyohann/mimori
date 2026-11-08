import { deleteImage, isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { getPrisma } from "@/lib/db";
import { toGalleryPhoto } from "@/lib/gallery-source";
import {
  MAX_PHOTO_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  UPLOAD_FORMAT_LABEL,
  normalizePhotoTitle,
  normalizeUploadKind,
  normalizeUploadMime,
  sanitizeFileName,
  sniffImageMime,
  uploadSizeError,
} from "@/lib/photo-upload";

/**
 * POST /api/photos/upload
 *
 * One image per request, so the dialog can show a real progress bar and a
 * per-file status. The file is validated by its own bytes, uploaded to
 * Cloudinary with a server-side signature, and only then registered in the
 * `Photo` table. If the row cannot be written, the freshly uploaded asset is
 * deleted again rather than left orphaned.
 *
 * An optional `kind` field selects the `PhotoKind`: omitted means `GALLERY`, so
 * every existing upload behaves as before, and the Photo Booth's captures ask
 * for `PHOTO_BOOTH`. Only those two values are accepted.
 *
 * Mimori has no accounts ([D-013](../docs/DECISIONS.md)), so there is no
 * authentication to require here; the endpoint is protected by the same
 * exposure rules as the rest of the application.
 */

const NOT_CONFIGURED =
  "Photo uploads are not configured yet: the Cloudinary credentials are missing.";
const GALLERY_UNAVAILABLE = "The photo gallery is unavailable right now.";
const UNSUPPORTED_FILE = `That file is not a ${UPLOAD_FORMAT_LABEL} image.`;

export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return Response.json({ error: NOT_CONFIGURED }, { status: 503 });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "That upload could not be read. Try choosing the photo again." },
      { status: 400 },
    );
  }

  // An unknown kind is a client error, not a reason to guess a default.
  const kind = normalizeUploadKind(form.get("kind"));

  if (!kind) {
    return Response.json(
      { error: "That kind of upload is not allowed." },
      { status: 400 },
    );
  }

  const file = form.get("file");

  // The title is optional; an empty one means the photo has no caption.
  const title = normalizePhotoTitle(form.get("title"));

  if (title && title.length > MAX_PHOTO_TITLE_LENGTH) {
    return Response.json(
      {
        error: `A photo title can be at most ${MAX_PHOTO_TITLE_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Choose an image to upload." },
      { status: 400 },
    );
  }

  const sizeError = uploadSizeError(file.size);

  if (sizeError) {
    return Response.json(
      { error: sizeError },
      { status: file.size > MAX_UPLOAD_BYTES ? 413 : 400 },
    );
  }

  let bytes: Uint8Array;

  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return Response.json(
      { error: "That upload could not be read. Try choosing the photo again." },
      { status: 400 },
    );
  }

  // The file's own bytes decide the format; `File.type` is client-supplied.
  const mimeType = sniffImageMime(bytes);

  if (!mimeType) {
    return Response.json({ error: UNSUPPORTED_FILE }, { status: 415 });
  }

  const declared = normalizeUploadMime(file.type);

  if (declared && declared !== mimeType) {
    return Response.json(
      { error: "That file does not look like the image type it claims to be." },
      { status: 415 },
    );
  }

  const fileName = sanitizeFileName(file.name);

  // Booth captures are never de-duplicated: each frame belongs to one session,
  // and telling the client "this shot already exists" would attach a previous
  // session's photo (or fail its unique `photoId`) instead of storing it.
  if (kind === "GALLERY") {
    try {
      // Retrying or revisiting the picker with the same file must not upload it
      // twice: an identical record means the photo is already in the gallery.
      const existing = await getPrisma().photo.findFirst({
        where: {
          kind,
          fileName,
          fileSize: file.size,
          mimeType,
          caption: title,
        },
        select: { id: true, secureUrl: true, caption: true, fileName: true },
      });

      if (existing) {
        return Response.json(
          { photo: toGalleryPhoto(existing), kind, duplicate: true },
          { status: 200 },
        );
      }
    } catch (error) {
      console.error("POST /api/photos/upload could not check for duplicates", error);

      return Response.json({ error: GALLERY_UNAVAILABLE }, { status: 503 });
    }
  }

  let uploaded;

  try {
    uploaded = await uploadImage(file, fileName, kind);
  } catch (error) {
    console.error("POST /api/photos/upload failed at Cloudinary", error);

    return Response.json(
      { error: "Cloudinary could not store that photo. Try again in a moment." },
      { status: 502 },
    );
  }

  try {
    const row = await getPrisma().photo.create({
      data: {
        kind,
        publicId: uploaded.publicId,
        secureUrl: uploaded.secureUrl,
        fileName,
        caption: title,
        mimeType,
        fileSize: file.size,
        width: uploaded.width,
        height: uploaded.height,
      },
      select: { id: true, secureUrl: true, caption: true, fileName: true },
    });

    return Response.json({ photo: toGalleryPhoto(row), kind }, { status: 201 });
  } catch (error) {
    console.error("POST /api/photos/upload could not save the photo row", error);

    // The file is already in Cloudinary; without a row it would be orphaned.
    await deleteImage(uploaded.publicId);

    return Response.json(
      {
        error:
          "That photo could not be added to the gallery, so it was not kept. Try again.",
      },
      { status: 503 },
    );
  }
}
