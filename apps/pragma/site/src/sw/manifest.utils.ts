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

// @FollowsBlueprint utils-pure-module
export function pickNextSession(
  sessions: readonly OfflineManifestSession[],
  now: Date,
): OfflineManifestSession | null {
  const upcoming = sessions.filter((session) => new Date(session.date).getTime() > now.getTime());
  const soonestFirst = upcoming.toSorted((left, right) => {
    const dateDelta = new Date(left.date).getTime() - new Date(right.date).getTime();
    if (dateDelta !== 0) return dateDelta;
    return left.id.localeCompare(right.id);
  });
  return soonestFirst[0] ?? null;
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

export function manifestUrls(manifest: OfflineManifest): readonly string[] {
  const urls: string[] = [manifest.catalogListUrl, ...manifest.songDetailUrls];
  if (manifest.nextSessionUrl !== null) urls.push(manifest.nextSessionUrl);
  if (manifest.nextSetlistUrl !== null) urls.push(manifest.nextSetlistUrl);
  return urls;
}
