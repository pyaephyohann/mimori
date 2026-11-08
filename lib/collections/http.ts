import {
  CollectionNameTakenError,
  CollectionNotFoundError,
} from "./server";

export const STORE_UNAVAILABLE = "Collections are unavailable right now.";

/**
 * Maps a thrown store error onto the API response. Domain errors keep their
 * meaning (409 duplicate name, 404 missing collection); anything else is a
 * store failure, logged server-side and reported without internal detail.
 */
export function collectionErrorResponse(
  error: unknown,
  context: string,
): Response {
  if (error instanceof CollectionNameTakenError) {
    return Response.json({ error: error.message }, { status: 409 });
  }

  if (error instanceof CollectionNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  console.error(context, error);

  return Response.json({ error: STORE_UNAVAILABLE }, { status: 503 });
}
