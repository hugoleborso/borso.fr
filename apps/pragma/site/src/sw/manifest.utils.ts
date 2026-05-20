/**
 * Pure builder for the SW pre-cache list. Spec Q.O.D. *Offline cache
 * scope* = "next session only" — the GET /api/offline-manifest call
 * returns the catalog + the next-upcoming session's setlist, and this
 * util turns the response into the flat list of URLs the SW pins on
 * install. 100% coverage gated.
 *
 * The "next session" is whichever session — practice or concert — has
 * the smallest future date; selection is deterministic given `now`.
 */

export interface OfflineManifestSession {
  readonly id: string;
  readonly date: string;
}

export interface OfflineManifestSong {
  readonly id: string;
}

export interface OfflineManifestInput {
  readonly catalogListUrl: string;
  readonly songs: readonly OfflineManifestSong[];
  readonly sessions: readonly OfflineManifestSession[];
  readonly now: Date;
}

export interface OfflineManifest {
  readonly catalogListUrl: string;
  readonly songDetailUrls: readonly string[];
  readonly nextSessionUrl: string | null;
  readonly nextSetlistUrl: string | null;
}

/**
 * Picks the upcoming session whose date is smallest but > now. Returns
 * `null` if every session is in the past or the list is empty. Stable
 * tie-break by id ascending so callers get a deterministic answer
 * even if two sessions land at the same instant.
 */
export function pickNextSession(
  sessions: readonly OfflineManifestSession[],
  now: Date,
): OfflineManifestSession | null {
  const futureSessions = sessions.filter((session) => new Date(session.date).getTime() > now.getTime());
  if (futureSessions.length === 0) return null;
  const sorted = [...futureSessions].sort((left, right) => {
    const dateDelta = new Date(left.date).getTime() - new Date(right.date).getTime();
    if (dateDelta !== 0) return dateDelta;
    return left.id.localeCompare(right.id);
  });
  return sorted[0] ?? null;
}

export function buildOfflineManifest(input: OfflineManifestInput): OfflineManifest {
  const next = pickNextSession(input.sessions, input.now);
  return {
    catalogListUrl: input.catalogListUrl,
    songDetailUrls: input.songs.map((song) => `/api/songs/${song.id}`),
    nextSessionUrl: next === null ? null : `/api/sessions/${next.id}`,
    nextSetlistUrl: next === null ? null : `/api/setlists/by-session/${next.id}`,
  };
}

/**
 * Flattens an OfflineManifest to the array the SW passes to
 * `cache.addAll()`. Null entries (no upcoming session) are dropped.
 */
export function manifestUrls(manifest: OfflineManifest): readonly string[] {
  const urls: string[] = [manifest.catalogListUrl, ...manifest.songDetailUrls];
  if (manifest.nextSessionUrl !== null) urls.push(manifest.nextSessionUrl);
  if (manifest.nextSetlistUrl !== null) urls.push(manifest.nextSetlistUrl);
  return urls;
}
