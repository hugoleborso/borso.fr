export interface SetlistSongCount {
  readonly setlistId: string;
  readonly songCount: number;
}

const FIRST_POSITION = 0;

// @FollowsBlueprint core-decision
export function selectNextLinkPosition(highestTakenPosition: number | null): number {
  if (highestTakenPosition === null) return FIRST_POSITION;
  return highestTakenPosition + 1;
}

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
