/**
 * Builds the preview fixture: a handful of instruments, members with
 * instrument rosters, songs carrying varied `baseEnergy`, and a concert
 * session whose setlist references those songs.
 *
 * Setlist entries are seeded with `energy: null` on purpose, so the
 * editor exercises the baseEnergy display fallback while the energy
 * curve still varies through each song's own `baseEnergy`.
 *
 * Every write goes through the owning slice's service, so the fixture
 * cannot drift from the rules the product enforces.
 */

import { bootstrapAuth } from '../auth/auth.service';
import { createInstrument } from '../instruments/instruments.service';
import { assignInstrumentsToMember, createMember } from '../members/members.service';
import { createSession } from '../sessions/sessions.service';
import { appendEntry, createSetlistForSession } from '../setlists/setlists.service';
import { createSong } from '../songs/songs.service';
import { selectAdminCredentialsState, selectInstrumentIds } from './test-seed.core';
import { deleteAllDomainRows } from './test-seed.repository';

const CONCERT_DAYS_FROM_NOW = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const CONCERT_CAPACITY = 120;
const CONCERT_VENUE = 'Le Petit Bain';
const CONCERT_GEAR = 'Full backline provided';
const SEED_ADMIN_PASSWORD = 'pragma-preview';

type SongCreateInput = Parameters<typeof createSong>[0];

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
  readonly status: SongCreateInput['status'];
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

function buildSongInput(song: SeedSong): SongCreateInput {
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

async function seedMembers(instrumentIdByName: ReadonlyMap<string, string>): Promise<void> {
  for (const seed of SEED_MEMBERS) {
    const member = await createMember({ firstName: seed.firstName, color: seed.color });
    await assignInstrumentsToMember(
      member.id,
      selectInstrumentIds(seed.instrumentNames, instrumentIdByName),
    );
  }
}

async function seedSongs(): Promise<string[]> {
  const songIds: string[] = [];
  for (const seed of SEED_SONGS) {
    const song = await createSong(buildSongInput(seed));
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
  const created = await createSetlistForSession(concert.id);
  if (created.kind === 'already-exists')
    throw new Error('seeded concert already carries a setlist');
  for (const songId of songIds) {
    await appendEntry(created.setlist.id, {
      songId,
      energy: null,
      lineupOverride: null,
      keyOverride: null,
      capo: null,
      notes: '',
    });
  }
}

export async function seedPreviewFixture(now: Date): Promise<SeedSummary> {
  await deleteAllDomainRows();
  const bootstrap = await bootstrapAuth(SEED_ADMIN_PASSWORD, now);
  const instrumentIdByName = await seedInstruments();
  await seedMembers(instrumentIdByName);
  const songIds = await seedSongs();
  await seedConcertSetlist(songIds, now);

  return {
    instruments: SEED_INSTRUMENTS.length,
    members: SEED_MEMBERS.length,
    songs: SEED_SONGS.length,
    setlistEntries: songIds.length,
    adminPassword: SEED_ADMIN_PASSWORD,
    adminCredentials: selectAdminCredentialsState(bootstrap.kind),
  };
}
