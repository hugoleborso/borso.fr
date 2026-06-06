/**
 * Test-only seeding endpoint. Mounted by `app.ts` ONLY when
 * `PRAGMA_ALLOW_TEST_SEED === '1'`. CDK never sets that flag on the
 * prod stack (asserted in `cdk/lib/stack.test.ts`).
 *
 * One fixture per `?fixture=` value. `basic-band` lays down a small but
 * complete world — 4 members, 3 instruments, 6 songs across the 4
 * statuses, 2 sessions (1 upcoming concert + 1 past practice), and a
 * setlist on the concert with 4 entries — enough for a reviewer to
 * exercise every screen. Calls are idempotent: the controller wipes
 * domain tables first (auth tables stay so the existing session cookie
 * keeps working), then re-inserts.
 *
 * Wipe order goes children → parents because Aurora DSQL does not
 * enforce FK at write time and `TRUNCATE … CASCADE` is a test-harness
 * tool, not a Lambda one.
 */

import { zValidator } from '@hono/zod-validator';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { type Database, getDatabase } from '../database/client';
import { insertInstrument } from '../instruments/instruments.repository';
import { insertMember, replaceMemberInstruments } from '../members/members.repository';
import {
  type ConcertInsertShape,
  insertSession,
  type PracticeInsertShape,
} from '../sessions/sessions.repository';
import { insertEntry, insertSetlist } from '../setlists/setlists.repository';
import { insertSong, type SongInsertShape, type SongStatus } from '../songs/songs.repository';

const FIXTURE_BASIC_BAND = 'basic-band';
const DAYS = 24 * 60 * 60 * 1000;

const WIPE_ORDER_CHILDREN_FIRST: readonly string[] = [
  'transition_comment',
  'setlist_entry',
  'setlist',
  'session',
  'mastery_override',
  'mastery_default',
  'bar',
  'song',
  'member_instrument',
  'instrument',
  'member',
];

const fixtureSchema = z.object({
  fixture: z.enum([FIXTURE_BASIC_BAND]),
});

interface MemberSeed {
  firstName: string;
  color: string;
  plays: ('guitar' | 'bass' | 'drums')[];
}

const MEMBER_SEEDS: readonly MemberSeed[] = [
  { firstName: 'Hugo', color: '#e85d75', plays: ['guitar'] },
  { firstName: 'Pauline', color: '#5db0e8', plays: ['bass'] },
  { firstName: 'Adrien', color: '#7be85d', plays: ['drums'] },
  { firstName: 'Camille', color: '#e8c75d', plays: ['guitar', 'bass'] },
];

interface SongSeed {
  title: string;
  artist: string;
  status: SongStatus;
  tonalityStart: string | null;
  baseEnergy: number | null;
}

const SONG_SEEDS: readonly SongSeed[] = [
  {
    title: 'Wake Me Up',
    artist: 'Avicii',
    status: 'concert_ready',
    tonalityStart: 'Bm',
    baseEnergy: 8,
  },
  { title: 'Africa', artist: 'Toto', status: 'concert_ready', tonalityStart: 'F#m', baseEnergy: 7 },
  { title: 'Take On Me', artist: 'a-ha', status: 'rehearsed', tonalityStart: 'A', baseEnergy: 9 },
  {
    title: "Don't Stop Believin'",
    artist: 'Journey',
    status: 'rehearsed',
    tonalityStart: 'E',
    baseEnergy: 9,
  },
  {
    title: 'Mr. Brightside',
    artist: 'The Killers',
    status: 'wip',
    tonalityStart: 'D♭',
    baseEnergy: 8,
  },
  { title: 'Hey Ya!', artist: 'OutKast', status: 'idea', tonalityStart: 'G', baseEnergy: 7 },
];

async function wipeDomain(database: Database): Promise<void> {
  for (const tableName of WIPE_ORDER_CHILDREN_FIRST) {
    await database.execute(sql.raw(`DELETE FROM "${tableName}"`));
  }
}

interface SeededInstruments {
  guitar: string;
  bass: string;
  drums: string;
}

async function seedInstruments(database: Database): Promise<SeededInstruments> {
  const guitar = await insertInstrument(database, { name: 'Guitare', isHarmonic: true });
  const bass = await insertInstrument(database, { name: 'Basse', isHarmonic: true });
  const drums = await insertInstrument(database, { name: 'Batterie', isHarmonic: false });
  return { guitar: guitar.id, bass: bass.id, drums: drums.id };
}

async function seedMembers(database: Database, instruments: SeededInstruments): Promise<string[]> {
  const memberIds: string[] = [];
  for (const seed of MEMBER_SEEDS) {
    const member = await insertMember(database, {
      firstName: seed.firstName,
      color: seed.color,
      avatarS3Key: null,
    });
    const instrumentIds = seed.plays.map((slug) => instruments[slug]);
    await replaceMemberInstruments(database, member.id, instrumentIds);
    memberIds.push(member.id);
  }
  return memberIds;
}

function toSongInsert(seed: SongSeed): SongInsertShape {
  return {
    title: seed.title,
    artist: seed.artist,
    status: seed.status,
    links: [],
    chart: null,
    tonalityStart: seed.tonalityStart,
    tonalityEnd: null,
    defaultLineup: {},
    baseEnergy: seed.baseEnergy,
    mbid: null,
    album: null,
    durationSeconds: null,
    isrcs: [],
    tags: [],
  };
}

async function seedSongs(database: Database): Promise<string[]> {
  const ids: string[] = [];
  for (const seed of SONG_SEEDS) {
    const song = await insertSong(database, toSongInsert(seed));
    ids.push(song.id);
  }
  return ids;
}

interface SeededSessions {
  concertId: string;
  practiceId: string;
}

async function seedSessions(database: Database, now: Date): Promise<SeededSessions> {
  const concertDate = new Date(now.getTime() + 14 * DAYS);
  const practiceDate = new Date(now.getTime() - 7 * DAYS);
  const concertSeed: ConcertInsertShape = {
    kind: 'concert',
    date: concertDate,
    venue: 'Les Disquaires',
    capacity: 80,
    gear: 'Sono maison + retours',
    friendsCountPerMember: {},
  };
  const practiceSeed: PracticeInsertShape = {
    kind: 'practice',
    date: practiceDate,
    preparedConcertId: null,
  };
  const concert = await insertSession(database, concertSeed);
  const practice = await insertSession(database, practiceSeed);
  return { concertId: concert.id, practiceId: practice.id };
}

async function seedSetlist(
  database: Database,
  sessionId: string,
  songIds: readonly string[],
): Promise<number> {
  const setlist = await insertSetlist(database, sessionId);
  const concertReadyAndRehearsed = songIds.slice(0, 4);
  for (const [index, songId] of concertReadyAndRehearsed.entries()) {
    await insertEntry(database, {
      setlistId: setlist.id,
      songId,
      position: index,
      energy: null,
      lineupOverride: null,
      keyOverride: null,
      capo: null,
      notes: '',
    });
  }
  return concertReadyAndRehearsed.length;
}

async function applyBasicBand(
  database: Database,
  now: Date,
): Promise<{
  members: number;
  instruments: number;
  songs: number;
  sessions: number;
  setlistEntries: number;
}> {
  const instruments = await seedInstruments(database);
  const memberIds = await seedMembers(database, instruments);
  const songIds = await seedSongs(database);
  const { concertId } = await seedSessions(database, now);
  const setlistEntries = await seedSetlist(database, concertId, songIds);
  return {
    members: memberIds.length,
    instruments: 3,
    songs: songIds.length,
    sessions: 2,
    setlistEntries,
  };
}

const testSeedRouter = new Hono()
  .use('*', requireSharedPasswordSession)
  .post('/seed', zValidator('query', fixtureSchema), async (context) => {
    const { fixture } = context.req.valid('query');
    const database = getDatabase();
    await wipeDomain(database);
    const counts = await applyBasicBand(database, new Date());
    return context.json({ fixture, ...counts });
  });

export { testSeedRouter };
