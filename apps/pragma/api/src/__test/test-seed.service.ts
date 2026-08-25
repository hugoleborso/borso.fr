import type { Lineup } from '@domain/lineup.core';
import { bootstrapAuth } from '../auth/auth.service';
import { createInstrument } from '../instruments/instruments.service';
import { assignInstrumentsToMember, createMember } from '../members/members.service';
import { createSession } from '../sessions/sessions.service';
import { appendEntry, createSetlist } from '../setlists/setlists.service';
import { createSong } from '../songs/songs.service';
import { saveTransitionComment } from '../transitions/transitions.service';
import {
  BLANK_ENTRY_DETAIL,
  SEED_INSTRUMENTS,
  SEED_MEMBERS,
  SEED_SONGS,
  SEED_TRANSITION_COMMENT,
  type SeedSong,
} from './test-seed-fixture.core';
import {
  buildSeedLineup,
  selectAdminCredentialsState,
  selectInstrumentIds,
} from './test-seed.core';
import { deleteAllDomainRows } from './test-seed.repository';

const CONCERT_DAYS_FROM_NOW = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const CONCERT_CAPACITY = 120;
const CONCERT_VENUE = 'Le Petit Bain';
const CONCERT_GEAR = 'Backline fournie, deux retours';
const SEED_ADMIN_PASSWORD = 'pragma-preview';
const SEED_SETLIST_NAME = 'Set principal';

type SongCreateInput = Parameters<typeof createSong>[0];

function buildSongInput(song: SeedSong, defaultLineup: Lineup): SongCreateInput {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    links: [],
    chart: { kind: 'chordpro', text: song.chordChartText },
    tonalityStart: song.tonalityStart,
    tonalityEnd: null,
    defaultLineup,
    baseEnergy: song.baseEnergy,
    mbid: null,
    album: null,
    durationSeconds: null,
    isrcs: [],
    tags: [],
    structureNotes: song.structureNotes,
    gimmickNotes: song.gimmickNotes,
    notes: song.notes,
  };
}

export interface SeedSummary {
  readonly instruments: number;
  readonly members: number;
  readonly songs: number;
  readonly setlistEntries: number;
  readonly adminPassword: string;
  readonly adminCredentials: 'created' | 'already-set';
}

async function seedInstruments(): Promise<Map<string, string>> {
  const instrumentIdByName = new Map<string, string>();
  for (const seed of SEED_INSTRUMENTS) {
    const instrument = await createInstrument(seed);
    instrumentIdByName.set(seed.name, instrument.id);
  }
  return instrumentIdByName;
}

async function seedMembers(
  instrumentIdByName: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
  const memberIdByName = new Map<string, string>();
  for (const seed of SEED_MEMBERS) {
    const member = await createMember({ firstName: seed.firstName, color: seed.color });
    memberIdByName.set(seed.firstName, member.id);
    await assignInstrumentsToMember(
      member.id,
      selectInstrumentIds(seed.instrumentNames, instrumentIdByName),
    );
  }
  return memberIdByName;
}

async function seedSongs(
  memberIdByName: ReadonlyMap<string, string>,
  instrumentIdByName: ReadonlyMap<string, string>,
): Promise<string[]> {
  const songIds: string[] = [];
  for (const seed of SEED_SONGS) {
    const lineup = buildSeedLineup(seed.lineup, memberIdByName, instrumentIdByName);
    const song = await createSong(buildSongInput(seed, lineup));
    songIds.push(song.id);
  }
  return songIds;
}

async function seedConcertSetlist(songIds: readonly string[], now: Date): Promise<void> {
  const concertDate = new Date(now.getTime() + CONCERT_DAYS_FROM_NOW * MILLISECONDS_PER_DAY);
  const concert = await createSession({
    kind: 'concert',
    date: concertDate.toISOString(),
    venue: CONCERT_VENUE,
    capacity: CONCERT_CAPACITY,
    gear: CONCERT_GEAR,
    friendsCountPerMember: {},
  });
  const created = await createSetlist({ name: SEED_SETLIST_NAME, sessionId: concert.id });
  if (created.kind === 'session-not-found')
    throw new Error('seeded concert vanished before its setlist was written');
  for (const [index, songId] of songIds.entries()) {
    const detail = SEED_SONGS[index]?.entry ?? BLANK_ENTRY_DETAIL;
    await appendEntry(created.setlist.id, {
      songId,
      energy: null,
      lineupOverride: null,
      keyOverride: detail.keyOverride,
      capo: detail.capo,
      notes: detail.notes,
    });
  }
}

async function seedTransitionComment(songIds: readonly string[], now: Date): Promise<void> {
  const [, songB, songC] = songIds;
  if (songB === undefined || songC === undefined) return;
  await saveTransitionComment(songB, songC, SEED_TRANSITION_COMMENT, now);
}

export async function seedPreviewFixture(now: Date): Promise<SeedSummary> {
  await deleteAllDomainRows();
  const bootstrap = await bootstrapAuth(SEED_ADMIN_PASSWORD, now);
  const instrumentIdByName = await seedInstruments();
  const memberIdByName = await seedMembers(instrumentIdByName);
  const songIds = await seedSongs(memberIdByName, instrumentIdByName);
  await seedConcertSetlist(songIds, now);
  await seedTransitionComment(songIds, now);

  return {
    instruments: SEED_INSTRUMENTS.length,
    members: SEED_MEMBERS.length,
    songs: SEED_SONGS.length,
    setlistEntries: songIds.length,
    adminPassword: SEED_ADMIN_PASSWORD,
    adminCredentials: selectAdminCredentialsState(bootstrap.kind),
  };
}
