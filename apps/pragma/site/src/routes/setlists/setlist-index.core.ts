/**
 * What the setlists index shows: every concert, newest first, each paired
 * with the setlist it already carries — or nothing, when it carries none.
 *
 * The pairing is positional because the reads come from one `useQueries`
 * call built from the same concert list, so query `n` answers concert `n`.
 * @Feature setlists
 */

const CONCERT_KIND = 'concert';

export interface SetlistPayload {
  readonly setlist: { readonly id: string };
}

export interface SetlistIndexRow<TConcert> {
  readonly session: TConcert;
  readonly setlistId: string | null;
}

// @FollowsBlueprint utils-pure-module
export function selectConcertsNewestFirst<TSession extends { kind: string; date: string }>(
  sessions: readonly TSession[],
): TSession[] {
  return sessions
    .filter((session) => session.kind === CONCERT_KIND)
    .toSorted((left, right) => right.date.localeCompare(left.date));
}

export function buildSetlistIndexRows<TConcert>(
  concerts: readonly TConcert[],
  setlistPayloads: readonly (SetlistPayload | null | undefined)[],
): SetlistIndexRow<TConcert>[] {
  return concerts.map((session, index) => ({
    session,
    setlistId: setlistPayloads[index]?.setlist.id ?? null,
  }));
}
