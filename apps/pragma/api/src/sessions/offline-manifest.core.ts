export interface OfflineManifestSession {
  readonly id: string;
  readonly date: Date;
}

export interface OfflineManifestSong {
  readonly id: string;
}

export interface OfflineManifestPayload {
  readonly catalogListUrl: string;
  readonly songDetailUrls: string[];
  readonly nextSessionUrl: string | null;
  readonly nextSetlistUrl: string | null;
}

const CATALOG_LIST_URL = '/api/songs';

function findNextSession(
  sessions: readonly OfflineManifestSession[],
  now: Date,
): OfflineManifestSession | undefined {
  return sessions
    .filter((session) => session.date.getTime() > now.getTime())
    .toSorted((left, right) => {
      const deltaMs = left.date.getTime() - right.date.getTime();
      if (deltaMs !== 0) return deltaMs;
      return left.id.localeCompare(right.id);
    })[0];
}

/**
 * @Blueprint core-projection
 * @BlueprintName Core Projection
 * @BlueprintUsage Use for a read model that turns rows and `now` into the exact payload the caller sends.
 * @BlueprintDescription Picks the next session by filtering strictly after `now` and sorting by date, then breaking a tie on the identifier so two sessions at the same instant always resolve the same way, and maps the songs to their urls. Pure, so the test pins both the tiebreak and the session starting exactly at `now`.
 */
export function buildNextSessionOfflineManifest(
  sessions: readonly OfflineManifestSession[],
  songs: readonly OfflineManifestSong[],
  now: Date,
): OfflineManifestPayload {
  const next = findNextSession(sessions, now);
  return {
    catalogListUrl: CATALOG_LIST_URL,
    songDetailUrls: songs.map((song) => `${CATALOG_LIST_URL}/${song.id}`),
    nextSessionUrl: next === undefined ? null : `/api/sessions/${next.id}`,
    nextSetlistUrl: next === undefined ? null : `/api/setlists/by-session/${next.id}`,
  };
}
