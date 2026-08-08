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
function isEarlierThan(
  candidate: OfflineManifestSession,
  incumbent: OfflineManifestSession,
): boolean {
  const dateDelta = new Date(candidate.date).getTime() - new Date(incumbent.date).getTime();
  if (dateDelta !== 0) return dateDelta < 0;
  return candidate.id.localeCompare(incumbent.id) < 0;
}

export function pickNextSession(
  sessions: readonly OfflineManifestSession[],
  now: Date,
): OfflineManifestSession | null {
  let nextSession: OfflineManifestSession | null = null;
  for (const session of sessions) {
    if (new Date(session.date).getTime() <= now.getTime()) continue;
    if (nextSession === null || isEarlierThan(session, nextSession)) nextSession = session;
  }
  return nextSession;
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
