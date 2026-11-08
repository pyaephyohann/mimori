/**
 * What the saved-session library needs to know about a session.
 *
 * The listing endpoint returns these rows newest first; the client keeps them in
 * the same order after a save or update so the library never has to refetch to
 * show a print it already has. Nothing here holds a capture — only the finished
 * print's URL, as a thumbnail.
 */

export type BoothSessionSummary = {
  id: string;
  /** ISO timestamp of when the session was first saved. */
  createdAt: string;
  photoCount: number;
  layout: string;
  borderKey: string;
  caption: string;
  /** The date printed on the paper (`yyyy-mm-dd`), when the print carries one. */
  printDate: string | null;
  /** The finished print, as a gallery photo. */
  print: { id: string; src: string };
  shotCount: number;
  /** The original captures in print order, as thumbnails for the library card. */
  shotThumbs: { id: string; src: string }[];
};

/**
 * Adds or replaces one session, newest first.
 *
 * Saving twice replaces the row instead of listing it twice, and updating a
 * session moves it nowhere: its `createdAt` is unchanged, so its position in the
 * library stays put. Sorting is by the server's own rule (newest first, id as
 * the tie-break) so a locally merged row lands exactly where a refetch would put
 * it.
 */
export function mergeSessionSummary(
  sessions: readonly BoothSessionSummary[],
  added: BoothSessionSummary,
): BoothSessionSummary[] {
  return [...sessions.filter((session) => session.id !== added.id), added].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );
}
