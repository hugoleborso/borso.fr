/**
 * Builds the preview fixture: instruments carrying a family, members
 * whose roster holds several instruments at once, songs with a default
 * lineup and the notes the band writes about them, and a concert
 * session whose setlist references those songs — including one gap
 * where nobody keeps a harmonic instrument, so the risky transition is
 * visible without editing anything.
 *
 * Setlist entries are seeded with `energy: null` on purpose, so the
 * editor exercises the baseEnergy display fallback while the energy
 * curve still varies through each song's own `baseEnergy`.
 *
 * Every write goes through the owning slice's service, so the fixture
 * cannot drift from the rules the product enforces.
 */

import type { InstrumentFamily } from '@domain/instrument.core';
import type { Lineup } from '@domain/lineup.core';
import { bootstrapAuth } from '../auth/auth.service';
import { createInstrument } from '../instruments/instruments.service';
import { assignInstrumentsToMember, createMember } from '../members/members.service';
import { createSession } from '../sessions/sessions.service';
import { appendEntry, createSetlistForSession } from '../setlists/setlists.service';
import { createSong } from '../songs/songs.service';
import { saveTransitionComment } from '../transitions/transitions.service';
import {
  buildSeedLineup,
  selectAdminCredentialsState,
  selectInstrumentIds,
  type SeedLineupByMemberName,
} from './test-seed.core';
import { deleteAllDomainRows } from './test-seed.repository';

const CONCERT_DAYS_FROM_NOW = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const CONCERT_CAPACITY = 120;
const CONCERT_VENUE = 'Le Petit Bain';
const CONCERT_GEAR = 'Backline fournie, deux retours';
const SEED_ADMIN_PASSWORD = 'pragma-preview';

type SongCreateInput = Parameters<typeof createSong>[0];

interface SeedInstrument {
  readonly name: string;
  readonly family: InstrumentFamily;
}

const SEED_INSTRUMENTS: readonly SeedInstrument[] = [
  { name: 'Guitare', family: 'harmonic' },
  { name: 'Clavier', family: 'harmonic' },
  { name: 'Basse', family: 'harmonic' },
  { name: 'Batterie', family: 'percussive' },
  { name: 'Chant', family: 'vocal' },
];

interface SeedMember {
  readonly firstName: string;
  readonly color: string;
  readonly instrumentNames: readonly string[];
}

const SEED_MEMBERS: readonly SeedMember[] = [
  { firstName: 'Hugo', color: '#e0533a', instrumentNames: ['Batterie', 'Chant'] },
  { firstName: 'Léa', color: '#2f8f6b', instrumentNames: ['Guitare', 'Chant'] },
  { firstName: 'Marc', color: '#3a6ee0', instrumentNames: ['Basse'] },
  { firstName: 'Sarah', color: '#b8841a', instrumentNames: ['Clavier', 'Chant'] },
];

interface SeedSong {
  readonly title: string;
  readonly artist: string;
  readonly status: SongCreateInput['status'];
  readonly tonalityStart: string | null;
  readonly baseEnergy: number;
  readonly lineup: SeedLineupByMemberName;
  readonly structureNotes: string;
  readonly gimmickNotes: string;
  readonly notes: string;
}

const SEED_SONGS: readonly SeedSong[] = [
  {
    title: 'Slow Burn',
    artist: 'The Embers',
    status: 'concert_ready',
    tonalityStart: 'Am',
    baseEnergy: 3,
    lineup: {
      Hugo: ['Batterie', 'Chant'],
      Léa: ['Guitare'],
      Marc: ['Basse'],
      Sarah: ['Clavier'],
    },
    structureNotes: 'intro ×4 · couplet · refrain · couplet · refrain · pont · refrain ×2',
    gimmickNotes: 'Break complet avant le dernier refrain, Hugo compte 1-2-3-4 à voix haute.',
    notes: 'Baisser le gain de la guitare sur le pont.',
  },
  {
    title: 'Midnight Drive',
    artist: 'Nova Reef',
    status: 'concert_ready',
    tonalityStart: 'C',
    baseEnergy: 6,
    lineup: {
      Hugo: ['Batterie'],
      Léa: ['Guitare', 'Chant'],
      Marc: ['Basse'],
      Sarah: ['Clavier'],
    },
    structureNotes: 'intro clavier 8 mesures · couplet · refrain · solo · refrain',
    gimmickNotes: 'Le solo part sur un signe de Léa, pas sur un compte.',
    notes: '',
  },
  {
    title: 'Lightning',
    artist: 'Volt',
    status: 'rehearsed',
    tonalityStart: 'E',
    baseEnergy: 9,
    lineup: { Hugo: ['Batterie'], Léa: ['Chant'], Sarah: ['Chant'] },
    structureNotes: 'attaque directe sur le refrain, pas d’intro',
    gimmickNotes: 'Marc ne joue pas : il change de basse pendant le morceau.',
    notes: 'Enchaînement délicat, personne ne garde d’instrument harmonique avant.',
  },
  {
    title: 'Afterglow',
    artist: 'Nova Reef',
    status: 'concert_ready',
    tonalityStart: 'G',
    baseEnergy: 5,
    lineup: {
      Hugo: ['Batterie', 'Chant'],
      Léa: ['Guitare'],
      Marc: ['Basse'],
      Sarah: ['Clavier', 'Chant'],
    },
    structureNotes: 'couplet · refrain · couplet · refrain · outro instrumentale',
    gimmickNotes: '',
    notes: '',
  },
  {
    title: 'Runaway Sun',
    artist: 'The Embers',
    status: 'wip',
    tonalityStart: 'D',
    baseEnergy: 8,
    lineup: { Hugo: ['Batterie'], Léa: ['Guitare', 'Chant'], Marc: ['Basse'] },
    structureNotes: '',
    gimmickNotes: '',
    notes: 'Le pont n’est pas encore calé.',
  },
  {
    title: 'Last Call',
    artist: 'Volt',
    status: 'rehearsed',
    tonalityStart: 'F',
    baseEnergy: 4,
    lineup: {
      Hugo: ['Batterie', 'Chant'],
      Léa: ['Guitare'],
      Marc: ['Basse'],
      Sarah: ['Clavier'],
    },
    structureNotes: 'couplet · refrain · pont long · refrain ×3',
    gimmickNotes: 'Fin suspendue : tout le monde s’arrête sauf le clavier.',
    notes: '',
  },
];

const SEED_TRANSITION_COMMENT = 'Léa annonce le titre pendant que Marc change de basse.';

function buildSongInput(song: SeedSong, defaultLineup: Lineup): SongCreateInput {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    links: [],
    chart: null,
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
