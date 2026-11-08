/**
 * The one shape an image has in the UI.
 *
 * Every photo Mimori shows or offers comes from a `Photo` row in the database
 * and is mapped to this shape by `toGalleryPhoto` (`lib/gallery-source.ts`).
 * There is deliberately no bundled list of images any more: the gallery is the
 * single source of truth, so an empty database means empty states rather than
 * placeholder pictures.
 */
export type Photo = {
  /** The `Photo` row's id — stable, and what collections/widgets/slots store. */
  id: string;
  /** Cloudinary secure delivery URL. */
  src: string;
  /** The photo's own title; may be empty, in which case no title is drawn. */
  caption: string;
  alt: string;
};
