/** @Feature sessions */

export interface PickableConcert {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
}

export interface PooledSetlist {
  readonly id: string;
  readonly songIds: readonly string[];
  readonly sessionIds: readonly string[];
}

export interface PracticeSongsEntry {
  readonly id: string;
  readonly songId: string;
  readonly position: number;
}

export interface PracticeSongsSavePlan {
  readonly ownSetlistId: string | null;
  readonly addSongIds: readonly string[];
  readonly removedEntries: readonly { readonly setlistId: string; readonly entryId: string }[];
  readonly unlinkedSetlistIds: readonly string[];
}

export interface PracticeSongsSaveInput {
  readonly practiceId: string;
  readonly practiceSetlists: readonly PooledSetlist[];
  readonly entriesBySetlistId: Readonly<Record<string, readonly PracticeSongsEntry[]>>;
  readonly tickedSongIds: readonly string[];
}

const CONCERT_KIND = 'concert';
const NO_ENTRIES: readonly PracticeSongsEntry[] = [];

function normalizeForSearch(text: string): string {
  // Stryker disable next-line MethodExpression: equivalent mutant, the search text and the query both go through this function, so folding both to upper case matches exactly what folding both to lower case does.
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function newestFirst(left: PickableConcert, right: PickableConcert): number {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

function keepFirstOccurrences(songIds: readonly string[]): readonly string[] {
  return [...new Set(songIds)];
}

// @FollowsBlueprint core-view-projection
export function listPickableConcerts<TConcert extends PickableConcert>(
  sessions: readonly TConcert[],
  query: string,
  searchTextOf: (concert: TConcert) => string,
): readonly TConcert[] {
  const needle = normalizeForSearch(query.trim());
  return sessions
    .filter((session) => session.kind === CONCERT_KIND)
    .filter((concert) => normalizeForSearch(searchTextOf(concert)).includes(needle))
    .toSorted(newestFirst);
}

// @FollowsBlueprint core-view-projection
export function poolConcertSongIds(
  concertIds: readonly string[],
  setlists: readonly PooledSetlist[],
): readonly string[] {
  return keepFirstOccurrences(
    concertIds.flatMap((concertId) =>
      setlists
        .filter((setlist) => setlist.sessionIds.includes(concertId))
        .flatMap((setlist) => setlist.songIds),
    ),
  );
}

// @FollowsBlueprint core-view-projection
export function listPracticeSongIds(
  practiceSetlists: readonly { readonly id: string }[],
  entriesBySetlistId: Readonly<Record<string, readonly PracticeSongsEntry[]>>,
): readonly string[] {
  return keepFirstOccurrences(
    practiceSetlists.flatMap((setlist) =>
      (entriesBySetlistId[setlist.id] ?? NO_ENTRIES)
        .toSorted((left, right) => left.position - right.position)
        .map((entry) => entry.songId),
    ),
  );
}

// @FollowsBlueprint core-view-projection
export function listPickableSongIds(
  pooledSongIds: readonly string[],
  practiceSongIds: readonly string[],
): readonly string[] {
  return keepFirstOccurrences([...pooledSongIds, ...practiceSongIds]);
}

// @FollowsBlueprint core-decision
export function togglePickedId(pickedIds: readonly string[], id: string): string[] {
  if (pickedIds.includes(id)) return pickedIds.filter((picked) => picked !== id);
  return [...pickedIds, id];
}

function isOwnedBy(setlist: PooledSetlist, practiceId: string): boolean {
  return setlist.sessionIds.length === 1 && setlist.sessionIds[0] === practiceId;
}

// @FollowsBlueprint core-decision
export function planPracticeSongsSave(input: PracticeSongsSaveInput): PracticeSongsSavePlan {
  const owned = input.practiceSetlists.filter((setlist) => isOwnedBy(setlist, input.practiceId));
  const shared = input.practiceSetlists.filter((setlist) => !isOwnedBy(setlist, input.practiceId));
  const ownedEntries = owned.flatMap((setlist) =>
    (input.entriesBySetlistId[setlist.id] ?? NO_ENTRIES).map((entry) => ({
      setlistId: setlist.id,
      entry,
    })),
  );
  const ownedSongIds = new Set(ownedEntries.map(({ entry }) => entry.songId));
  return {
    ownSetlistId: owned[0]?.id ?? null,
    addSongIds: keepFirstOccurrences(
      input.tickedSongIds.filter((songId) => !ownedSongIds.has(songId)),
    ),
    removedEntries: ownedEntries
      .filter(({ entry }) => !input.tickedSongIds.includes(entry.songId))
      .map(({ setlistId, entry }) => ({ setlistId, entryId: entry.id })),
    unlinkedSetlistIds: shared.map((setlist) => setlist.id),
  };
}
