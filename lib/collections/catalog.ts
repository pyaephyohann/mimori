/**
 * Collections shared vocabulary.
 *
 * Used by the browser (pages, cards, dialogs) and the server (validation and
 * the Prisma store), so it holds no React and no database code. Photo
 * references are gallery `Photo` ids — the gallery is the only image source —
 * so a collection never duplicates an image or its record.
 */

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  pinned: boolean;
  /** Explicit cover, or `null` to fall back to the first photo. */
  coverPhotoId: string | null;
  /** Gallery `Photo` ids in display order. */
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
};

export const MAX_COLLECTION_NAME_LENGTH = 60;
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 280;

/** Upper bound on a collection's photos, so a malformed payload cannot grow
 *  without limit. */
export const MAX_COLLECTION_PHOTOS = 200;

export const COLLECTION_SORTS = ["recent", "name", "photos"] as const;

export type CollectionSort = (typeof COLLECTION_SORTS)[number];

export const COLLECTION_SORT_LABELS: Record<CollectionSort, string> = {
  recent: "Newest first",
  name: "Name A–Z",
  photos: "Most photos",
};

export function isCollectionSort(value: unknown): value is CollectionSort {
  return (
    typeof value === "string" &&
    (COLLECTION_SORTS as readonly string[]).includes(value)
  );
}

/**
 * The photo to show on a collection card: its own cover when one was chosen,
 * otherwise the first photo in the collection. `null` means the collection is
 * still empty and the card draws a blank scrapbook cover.
 */
export function coverPhotoId(
  collection: Pick<Collection, "coverPhotoId" | "photoIds">,
): string | null {
  return collection.coverPhotoId ?? collection.photoIds[0] ?? null;
}

/** Case-insensitive match against a collection's name and description. */
export function matchesQuery(collection: Collection, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return true;
  }

  return (
    collection.name.toLowerCase().includes(needle) ||
    (collection.description ?? "").toLowerCase().includes(needle)
  );
}

/** Pinned collections first is handled by the sections; this orders one list. */
export function sortCollections(
  collections: readonly Collection[],
  sort: CollectionSort,
): Collection[] {
  const sorted = [...collections];

  if (sort === "name") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "photos") {
    return sorted.sort(
      (a, b) => b.photoIds.length - a.photoIds.length || a.name.localeCompare(b.name),
    );
  }

  return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
