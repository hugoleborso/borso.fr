/**
 * Pure rules of the setlists context: where a setlist lands when it
 * joins a session, and how many songs each setlist holds once the rows
 * come back unordered from one query.
 */

export interface SetlistSongCount {
  readonly setlistId: string;
  readonly songCount: number;
}

const FIRST_POSITION = 0;

/**
 * The position the next setlist of a session takes. One past the
 * highest already taken, so the order the band wrote is preserved
 * rather than reset every time a setlist is attached.
 */
// @FollowsBlueprint core-decision
export function selectNextLinkPosition(highestTakenPosition: number | null): number {
  if (highestTakenPosition === null) return FIRST_POSITION;
  return highestTakenPosition + 1;
}

/**
 * Turns the flat entry rows of several setlists into one count per
 * setlist, in the order asked for. A setlist with no entry is present
 * with a count of zero, because a caller listing setlists needs a
 * number for every one of them, not only for those already filled.
 */
// @FollowsBlueprint core-projection
export function tallySongsPerSetlist(
  setlistIds: readonly string[],
  entryRows: readonly { readonly setlistId: string }[],
): SetlistSongCount[] {
  const countBySetlistId = new Map<string, number>();
  for (const row of entryRows) {
    countBySetlistId.set(row.setlistId, (countBySetlistId.get(row.setlistId) ?? 0) + 1);
  }
  return setlistIds.map((setlistId) => ({
    setlistId,
    songCount: countBySetlistId.get(setlistId) ?? 0,
  }));
}

export interface SetlistSummary {
  readonly id: string;
  readonly name: string;
  readonly songCount: number;
  readonly sessionIds: string[];
}

/**
 * What a list of setlists needs to show: each setlist with how many
 * songs it holds and which sessions carry it. The three inputs come
 * from three queries rather than one join, so the assembly happens
 * here where it can be read and tested.
 */
// @FollowsBlueprint core-projection
export function buildSetlistSummaries(
  setlists: readonly { readonly id: string; readonly name: string }[],
  songCounts: readonly SetlistSongCount[],
  links: readonly { readonly setlistId: string; readonly sessionId: string }[],
): SetlistSummary[] {
  const songCountBySetlistId = new Map(
    songCounts.map((count) => [count.setlistId, count.songCount]),
  );
  const sessionIdsBySetlistId = new Map<string, string[]>();
  for (const link of links) {
    const known = sessionIdsBySetlistId.get(link.setlistId);
    if (known === undefined) {
      sessionIdsBySetlistId.set(link.setlistId, [link.sessionId]);
      continue;
    }
    known.push(link.sessionId);
  }
  return setlists.map((setlist) => ({
    id: setlist.id,
    name: setlist.name,
    songCount: songCountBySetlistId.get(setlist.id) ?? 0,
    sessionIds: sessionIdsBySetlistId.get(setlist.id) ?? [],
  }));
}
