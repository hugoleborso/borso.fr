import type { InstrumentFamily } from '@domain/instrument.core';
import { SONG_STATUSES } from '../songs/songs.schema';
import type { SeedLineupByMemberName } from './test-seed.core';

type SeedSongStatus = (typeof SONG_STATUSES)[number];

export interface SeedInstrument {
  readonly name: string;
  readonly family: InstrumentFamily;
}

export const SEED_INSTRUMENTS: readonly SeedInstrument[] = [
  { name: 'Guitare', family: 'harmonic' },
  { name: 'Clavier', family: 'harmonic' },
  { name: 'Basse', family: 'harmonic' },
  { name: 'Batterie', family: 'percussive' },
  { name: 'Chant', family: 'vocal' },
];

export interface SeedMember {
  readonly firstName: string;
  readonly color: string;
  readonly instrumentNames: readonly string[];
}

export const SEED_MEMBERS: readonly SeedMember[] = [
  { firstName: 'Hugo', color: '#e0533a', instrumentNames: ['Batterie', 'Chant'] },
  { firstName: 'Léa', color: '#2f8f6b', instrumentNames: ['Guitare', 'Chant'] },
  { firstName: 'Marc', color: '#3a6ee0', instrumentNames: ['Basse'] },
  { firstName: 'Sarah', color: '#b8841a', instrumentNames: ['Clavier', 'Chant'] },
];

export interface SeedEntryDetail {
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
}

export interface SeedSong {
  readonly title: string;
  readonly artist: string;
  readonly status: SeedSongStatus;
  readonly tonalityStart: string | null;
  readonly baseEnergy: number;
  readonly lineup: SeedLineupByMemberName;
  readonly structureNotes: string;
  readonly gimmickNotes: string;
  readonly notes: string;
  readonly chordChartText: string;
  readonly entry: SeedEntryDetail;
}

export const SEED_SONGS: readonly SeedSong[] = [
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
    chordChartText: `{title: Slow Burn}
{key: Am}
{start_of_verse}
[Am]Lights go down, the [F]room turns amber
[C]Nobody moves, the [G]record spins
[Am]Half a word be[F]comes an answer
[C]Slow burn [G]always wins
{end_of_verse}

{start_of_chorus}
[F]Hold it [C]low, hold it [G]steady
[F]Let the [C]embers [G]breathe
[F]Nothing [C]here is [G]ready
[Am]Nothing here will [G]leave
{end_of_chorus}

{start_of_verse}
[Am]Ash and velvet [F]on the counter
[C]Someone hums the [G]second line
[Am]Every chorus [F]sounds a rounder
[C]Slow burn [G]keeps the time
{end_of_verse}

{start_of_bridge}
[Dm]Break — drums count [E7]one two three four
[Dm]Everybody [E7]in on four
{end_of_bridge}

{start_of_chorus}
[F]Hold it [C]low, hold it [G]steady
[F]Let the [C]embers [G]breathe
{end_of_chorus}`,
    entry: { keyOverride: null, capo: null, notes: 'Ouverture — attendre que la salle se taise.' },
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
    chordChartText: `{title: Midnight Drive}
{key: C}
{start_of_verse}
[C]Keys on the dashboard, [Am]engine warm
[F]Radio static [G]keeping form
[C]Streetlights counting [Am]what we owe
[F]Midnight drive, [G]nowhere to go
{end_of_verse}

{start_of_chorus}
[F]Drive, [G]drive, [C]let the city [Am]blur
[F]Drive, [G]drive, [C]we were never [Am]sure
{end_of_chorus}

{start_of_verse}
[C]Windows down on [Am]empty lanes
[F]Every exit [G]sounds the same
{end_of_verse}

{start_of_bridge}
[Dm]Solo starts on [G]Léa's cue
[Dm]Eight bars, then [G]back to two
{end_of_bridge}

{start_of_chorus}
[F]Drive, [G]drive, [C]let the city [Am]blur
{end_of_chorus}`,
    entry: { keyOverride: null, capo: null, notes: '' },
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
    chordChartText: `{title: Lightning}
{key: E}
{start_of_chorus}
[E]Lightning! [A]Straight into the [B]chorus
[E]Lightning! [A]No intro, no [B]warning
{end_of_chorus}

{start_of_verse}
[E]Count it in your [A]head, there is no count
[E]Marc is changing [A]basses, hold the [B]sound
[E]Two voices only, [A]drums and shout
[E]Everything else [B]comes around
{end_of_verse}

{start_of_chorus}
[E]Lightning! [A]Straight into the [B]chorus
[E]Lightning! [A]Nobody is [B]bored
{end_of_chorus}

{start_of_verse}
[E]Second verse, the [A]room is loud
[E]Sarah takes the [B]harmony now
{end_of_verse}`,
    entry: {
      keyOverride: 'F#',
      capo: 2,
      notes: 'Léa annonce le titre pendant le changement de basse.',
    },
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
    chordChartText: `{title: Afterglow}
{key: G}
{start_of_verse}
[G]After the last [Em]chord decays
[C]Someone leaves a [D]glass behind
[G]Afterglow on [Em]empty stage
[C]Nothing left to [D]find
{end_of_verse}

{start_of_chorus}
[C]Stay for the [D]quiet, [G]stay for the [Em]hum
[C]Stay for the [D]part where the [G]lights go [Em]dumb
{end_of_chorus}

{start_of_verse}
[G]Cables coiled and [Em]cases shut
[C]Sarah plays the [D]outro cut
{end_of_verse}

{start_of_chorus}
[C]Stay for the [D]quiet, [G]stay for the [Em]hum
{end_of_chorus}

{start_of_tab}
e|---------------7-----|
B|-------8---8---------|
G|---7-----------------|
{end_of_tab}`,
    entry: { keyOverride: null, capo: null, notes: '' },
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
    chordChartText: `{title: Runaway Sun}
{key: D}
{start_of_verse}
[D]Runaway sun on a [A]borrowed road
[G]Nothing in the tank but [A]what we're owed
[D]Bridge is not settled, [A]play it loose
[G]Léa calls the change, [A]we follow through
{end_of_verse}

{start_of_chorus}
[G]Run, [A]run, [D]hold the [Bm]line
[G]Run, [A]run, [D]one more [Bm]time
{end_of_chorus}

{start_of_bridge}
[Bm]Unfinished — [G]four bars, maybe [A]eight
[Bm]Decide it on the [G]night
{end_of_bridge}`,
    entry: {
      keyOverride: null,
      capo: null,
      notes: 'Pont pas calé : rester sur quatre mesures ce soir.',
    },
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
    chordChartText: `{title: Last Call}
{key: F}
{start_of_verse}
[F]Last call, the [Dm]barman counts the till
[Bb]Chairs on tables, [C]everybody still
[F]One more chorus [Dm]nobody will hear
[Bb]Last call of the [C]year
{end_of_verse}

{start_of_chorus}
[Bb]Sing it [C]soft, sing it [F]slow
[Bb]Everybody [C]let it [Dm]go
[Bb]Sing it [C]soft, sing it [F]low
{end_of_chorus}

{start_of_bridge}
[Dm]Long bridge — keyboard [Bb]holds the last note
[Dm]Everyone stops, [C]Sarah stays afloat
{end_of_bridge}

{start_of_chorus}
[Bb]Sing it [C]soft, sing it [F]slow
[Bb]Everybody [C]let it [Dm]go
{end_of_chorus}`,
    entry: { keyOverride: null, capo: null, notes: '' },
  },
];

export const BLANK_ENTRY_DETAIL: SeedEntryDetail = { keyOverride: null, capo: null, notes: '' };

export const SEED_TRANSITION_COMMENT = 'Léa annonce le titre pendant que Marc change de basse.';
