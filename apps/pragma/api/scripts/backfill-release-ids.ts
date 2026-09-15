/**
 * @DependsOnExternal musicbrainz
 * @DependsOnExternal coverartarchive
 */

import { eq, isNull, and, isNotNull } from 'drizzle-orm';
import { getDatabase } from '../src/database/client';
import { rankReleaseCandidates } from '../src/songs/musicbrainz.core';
import { songTable } from '../src/songs/songs.schema';

const MUSICBRAINZ_LOOKUP_URL = 'https://musicbrainz.org/ws/2/recording/';
const MUSICBRAINZ_USER_AGENT = 'Pragma/1.0 (https://pragma.borso.fr)';
const COVER_ART_ARCHIVE_ORIGIN = 'https://coverartarchive.org';
const RATE_LIMIT_INTERVAL_MS = 1_100;
const APPLY_FLAG = '--apply';
const HTTP_OK = 200;

function report(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function readReleaseCandidates(mbid: string): Promise<string[]> {
  const url = `${MUSICBRAINZ_LOOKUP_URL}${encodeURIComponent(mbid)}?inc=releases&fmt=json`;
  const response = await fetch(url, { headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT } });
  if (!response.ok) return [];
  const recordingBody: unknown = await response.json();
  return rankReleaseCandidates(recordingBody);
}

async function hasCoverArt(releaseId: string): Promise<boolean> {
  const url = `${COVER_ART_ARCHIVE_ORIGIN}/release/${encodeURIComponent(releaseId)}/front-250`;
  const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  return response.status === HTTP_OK;
}

async function selectReleaseWithCover(mbid: string): Promise<string | null> {
  for (const candidate of await readReleaseCandidates(mbid)) {
    if (await hasCoverArt(candidate)) return candidate;
  }
  return null;
}

async function backfillReleaseIds(isApplying: boolean): Promise<void> {
  const database = getDatabase();
  const songs = await database
    .select({ id: songTable.id, title: songTable.title, mbid: songTable.mbid })
    .from(songTable)
    .where(and(isNotNull(songTable.mbid), isNull(songTable.releaseId)));

  report(`${String(songs.length)} song(s) carry a recording and no release.`);
  let matched = 0;

  for (const song of songs) {
    if (song.mbid === null) continue;
    const releaseId = await selectReleaseWithCover(song.mbid);
    if (releaseId === null) {
      report(`  no cover  ${song.title}`);
    } else {
      matched += 1;
      report(`  ${isApplying ? 'writing ' : 'would   '}  ${song.title} → ${releaseId}`);
      if (isApplying) {
        await database.update(songTable).set({ releaseId }).where(eq(songTable.id, song.id));
      }
    }
    await pause(RATE_LIMIT_INTERVAL_MS);
  }

  report(`${String(matched)} of ${String(songs.length)} song(s) found a release with artwork.`);
  if (!isApplying) report(`Nothing was written. Re-run with ${APPLY_FLAG} to write.`);
}

await backfillReleaseIds(process.argv.includes(APPLY_FLAG));
process.exit(0);
