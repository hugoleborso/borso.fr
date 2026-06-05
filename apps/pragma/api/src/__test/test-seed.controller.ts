/**
 * Test-only seeding endpoint. Mounted by `app.ts` ONLY when
 * `ALLOW_TEST_SEED === '1'` — a flag `PreviewableApp` injects on every
 * non-prod API Lambda and never on prod, so this route is structurally
 * unreachable in production.
 *
 * `POST /api/__test/seed` wipes the domain tables and writes one
 * coherent fixture: a handful of instruments, members with instrument
 * rosters, songs carrying varied `baseEnergy`, and a concert session
 * whose setlist references those songs. Setlist entries are seeded with
 * `energy: null` on purpose so the editor exercises the baseEnergy
 * display fallback; the energy curve still varies because each song
 * carries its own `baseEnergy`.
 */

import { Hono } from 'hono';
import { barTable } from '../bars/bars.schema';
import type { Database } from '../database/client';
import { getDatabase } from '../database/client';
import { insertInstrument } from '../instruments/instruments.repository';
import { instrumentTable } from '../instruments/instruments.schema';
import { masteryDefaultTable, masteryOverrideTable } from '../mastery/mastery.schema';
import { insertMember, replaceMemberInstruments } from '../members/members.repository';
import { memberInstrumentTable, memberTable } from '../members/members.schema';
import { insertSession } from '../sessions/sessions.repository';
import { sessionTable } from '../sessions/sessions.schema';
import { insertEntry, insertSetlist } from '../setlists/setlists.repository';
import { setlistEntryTable, setlistTable } from '../setlists/setlists.schema';
import { insertSong, type SongInsertShape } from '../songs/songs.repository';
import { songTable } from '../songs/songs.schema';
import { transitionCommentTable } from '../transitions/transitions.schema';

const CONCERT_DAYS_FROM_NOW = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CONCERT_CAPACITY = 120;

interface SeedInstrument {
  readonly name: string;
  readonly isHarmonic: boolean;
}

const SEED_INSTRUMENTS: readonly SeedInstrument[] = [
  { name: 'Guitar', isHarmonic: true },
  { name: 'Keys', isHarmonic: true },
  { name: 'Bass', isHarmonic: false },
  { name: 'Drums', isHarmonic: false },
  { name: 'Vocals', isHarmonic: false },
];

interface SeedMember {
  readonly firstName: string;
  readonly color: string;
  readonly instrumentNames: readonly string[];
}

const SEED_MEMBERS: readonly SeedMember[] = [
  { firstName: 'Alice', color: '#e0533a', instrumentNames: ['Guitar', 'Vocals'] },
  { firstName: 'Bob', color: '#2f8f6b', instrumentNames: ['Bass'] },
  { firstName: 'Carla', color: '#3a6ee0', instrumentNames: ['Keys', 'Vocals'] },
  { firstName: 'Dan', color: '#b8841a', instrumentNames: ['Drums'] },
];

interface SeedSong {
  readonly title: string;
  readonly artist: string;
  readonly status: SongInsertShape['status'];
  readonly tonalityStart: string | null;
  readonly baseEnergy: number;
}

const SEED_SONGS: readonly SeedSong[] = [
  {
    title: 'Slow Burn',
    artist: 'The Embers',
    status: 'concert_ready',
    tonalityStart: 'Am',
    baseEnergy: 3,
  },
  {
    title: 'Midnight Drive',
    artist: 'Nova Reef',
    status: 'concert_ready',
    tonalityStart: 'C',
    baseEnergy: 6,
  },
  { title: 'Lightning', artist: 'Volt', status: 'rehearsed', tonalityStart: 'E', baseEnergy: 9 },
  {
    title: 'Afterglow',
    artist: 'Nova Reef',
    status: 'concert_ready',
    tonalityStart: 'G',
    baseEnergy: 5,
  },
  { title: 'Runaway Sun', artist: 'The Embers', status: 'wip', tonalityStart: 'D', baseEnergy: 8 },
  { title: 'Last Call', artist: 'Volt', status: 'rehearsed', tonalityStart: 'F', baseEnergy: 4 },
];

function buildSongInsert(song: SeedSong): SongInsertShape {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    links: [],
    chart: null,
    tonalityStart: song.tonalityStart,
    tonalityEnd: null,
    defaultLineup: {},
    baseEnergy: song.baseEnergy,
    mbid: null,
    album: null,
    durationSeconds: null,
    isrcs: [],
    tags: [],
  };
}

async function clearDomainTables(database: Database): Promise<void> {
  await database.delete(setlistEntryTable);
  await database.delete(setlistTable);
  await database.delete(sessionTable);
  await database.delete(memberInstrumentTable);
  await database.delete(masteryOverrideTable);
  await database.delete(masteryDefaultTable);
  await database.delete(transitionCommentTable);
  await database.delete(barTable);
  await database.delete(songTable);
  await database.delete(memberTable);
  await database.delete(instrumentTable);
}

interface SeedSummary {
  readonly instruments: number;
  readonly members: number;
  readonly songs: number;
  readonly setlistEntries: number;
}

async function applyFixture(database: Database, now: Date): Promise<SeedSummary> {
  await clearDomainTables(database);

  const instrumentIdByName = new Map<string, string>();
  for (const seed of SEED_INSTRUMENTS) {
    const row = await insertInstrument(database, seed);
    instrumentIdByName.set(seed.name, row.id);
  }

  for (const seed of SEED_MEMBERS) {
    const member = await insertMember(database, {
      firstName: seed.firstName,
      color: seed.color,
      avatarS3Key: null,
    });
    const instrumentIds = seed.instrumentNames.flatMap((name) => {
      const id = instrumentIdByName.get(name);
      return id === undefined ? [] : [id];
    });
    await replaceMemberInstruments(database, member.id, instrumentIds);
  }

  const songIds: string[] = [];
  for (const seed of SEED_SONGS) {
    const row = await insertSong(database, buildSongInsert(seed));
    songIds.push(row.id);
  }

  const concertDate = new Date(now.getTime() + CONCERT_DAYS_FROM_NOW * MS_PER_DAY);
  const concert = await insertSession(database, {
    kind: 'concert',
    date: concertDate,
    venue: 'Le Petit Bain',
    capacity: CONCERT_CAPACITY,
    gear: 'Full backline provided',
    friendsCountPerMember: {},
  });

  const setlist = await insertSetlist(database, concert.id);
  for (let position = 0; position < songIds.length; position += 1) {
    const songId = songIds[position];
    if (songId === undefined) continue;
    await insertEntry(database, {
      setlistId: setlist.id,
      songId,
      position,
      energy: null,
      lineupOverride: null,
      keyOverride: null,
      capo: null,
      notes: '',
    });
  }

  return {
    instruments: SEED_INSTRUMENTS.length,
    members: SEED_MEMBERS.length,
    songs: SEED_SONGS.length,
    setlistEntries: songIds.length,
  };
}

const testSeedRouter = new Hono().post('/seed', async (context) => {
  const summary = await applyFixture(getDatabase(), new Date());
  return context.json(summary);
});

export { testSeedRouter };
