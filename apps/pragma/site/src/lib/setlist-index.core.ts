/**
 * What the setlists index shows: every setlist the band has written,
 * with the sessions carrying it resolved from the sessions already
 * loaded by the page.
 *
 * A setlist attached to nothing sorts first, because it is either just
 * created or waiting to be attached, and both are the states the
 * operator came to the page to act on. The rest follow by their latest
 * session, most recent first, with the name breaking ties so the order
 * never depends on the order rows came back in.
 * @Feature setlists
 */

export interface IndexSession {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly venue: string | null;
}

export interface IndexSetlist {
  readonly id: string;
  readonly name: string;
  readonly songCount: number;
  readonly sessionIds: readonly string[];
}

export interface SetlistIndexRow<TSession extends IndexSession> {
  readonly id: string;
  readonly name: string;
  readonly songCount: number;
  readonly sessions: TSession[];
}

/**
 * A row's sessions are held most recent first, so the one at the front
 * is its latest, and a row no session carries has none at all — which
 * is what sorts it above the rest rather than any date it could stand
 * in for.
 */
function compareRows(
  left: SetlistIndexRow<IndexSession>,
  right: SetlistIndexRow<IndexSession>,
): number {
  const leftLatest = left.sessions[0];
  const rightLatest = right.sessions[0];
  if (leftLatest === undefined && rightLatest === undefined) {
    return left.name.localeCompare(right.name);
  }
  if (leftLatest === undefined) return -1;
  if (rightLatest === undefined) return 1;
  const byLatestSession = rightLatest.date.localeCompare(leftLatest.date);
  if (byLatestSession !== 0) return byLatestSession;
  return left.name.localeCompare(right.name);
}

// @FollowsBlueprint utils-pure-module
export function buildSetlistIndexRows<TSession extends IndexSession>(
  setlists: readonly IndexSetlist[],
  sessions: readonly TSession[],
): SetlistIndexRow<TSession>[] {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const rows = setlists.map((setlist) => ({
    id: setlist.id,
    name: setlist.name,
    songCount: setlist.songCount,
    sessions: setlist.sessionIds
      .map((sessionId) => sessionById.get(sessionId))
      .filter((session): session is TSession => session !== undefined)
      .toSorted((left, right) => right.date.localeCompare(left.date)),
  }));
  return rows.toSorted(compareRows);
}
