/** @Feature practice-mode */

import type { Lineup } from '@domain/lineup.core';
import { bandDayOf } from '@domain/session-schedule.core';
import { z } from 'zod';
import {
  compactLineup,
  lineupOf,
  type SetlistEditorSong,
  tonalityLabelFor,
} from '../../components/organisms/setlist-editor.utils';
import { transitionPairKey } from '../../components/organisms/transition-view.core';

export interface PracticeSetlist {
  readonly id: string;
  readonly name: string;
}

export interface PracticeEntry {
  readonly id: string;
  readonly songId: string;
  readonly position: number;
}

export interface PracticeSong {
  readonly entryId: string;
  readonly songId: string;
  readonly setlistId: string;
  readonly setlistName: string;
}

export interface PracticeModeOfferInput {
  readonly kind: string;
  readonly date: string;
  readonly songCount: number;
  readonly now: Date;
}

const PRACTICE_KIND = 'practice';
const FIRST_INDEX = 0;
const NO_ENTRIES: readonly PracticeEntry[] = [];

// @FollowsBlueprint core-decision
export function isPracticeModeOffered(input: PracticeModeOfferInput): boolean {
  return (
    input.kind === PRACTICE_KIND &&
    input.songCount > 0 &&
    bandDayOf(input.date) === bandDayOf(input.now)
  );
}

function byPosition(left: PracticeEntry, right: PracticeEntry): number {
  return left.position - right.position;
}

// @FollowsBlueprint core-view-projection
export function buildPracticeSongs(
  setlists: readonly PracticeSetlist[],
  entriesBySetlistId: Readonly<Record<string, readonly PracticeEntry[]>>,
): readonly PracticeSong[] {
  return setlists.flatMap((setlist) =>
    (entriesBySetlistId[setlist.id] ?? NO_ENTRIES).toSorted(byPosition).map((entry) => ({
      entryId: entry.id,
      songId: entry.songId,
      setlistId: setlist.id,
      setlistName: setlist.name,
    })),
  );
}

export interface StoredPracticePosition {
  readonly day: string;
  readonly entryId: string;
  readonly index: number;
}

const storedPracticePositionSchema = z.object({
  day: z.string(),
  entryId: z.string(),
  index: z.number().int().min(0),
});

// @FollowsBlueprint core-persisted-slice-parsed-not-trusted
export function parseStoredPracticePosition(text: string | null): StoredPracticePosition | null {
  // Stryker disable next-line ConditionalExpression: equivalent mutant. JSON.parse reads null as the JSON value null, which the schema refuses, so the function answers null either way.
  if (text === null) return null;
  try {
    const storedValue: unknown = JSON.parse(text);
    const position = storedPracticePositionSchema.safeParse(storedValue);
    return position.success ? position.data : null;
  } catch {
    return null;
  }
}

export function describeStoredPosition(
  songs: readonly PracticeSong[],
  index: number,
  now: Date,
): StoredPracticePosition | null {
  const song = songs[index];
  if (song === undefined) return null;
  return { day: bandDayOf(now), entryId: song.entryId, index };
}

export function serializePracticePosition(
  songs: readonly PracticeSong[],
  index: number,
  now: Date,
): string | null {
  const position = describeStoredPosition(songs, index, now);
  return position === null ? null : JSON.stringify(position);
}

export function selectPracticeAnchor(
  stored: StoredPracticePosition | null,
  arrival: StoredPracticePosition | null,
  now: Date,
): StoredPracticePosition | null {
  if (stored !== null && stored.day === bandDayOf(now)) return stored;
  return arrival;
}

function clampIndex(index: number, songCount: number): number {
  return Math.min(Math.max(index, FIRST_INDEX), songCount - 1);
}

// @FollowsBlueprint core-decision
export function resolvePracticeIndex(
  songs: readonly PracticeSong[],
  stored: StoredPracticePosition | null,
  now: Date,
): number {
  if (songs.length === 0 || stored === null) return FIRST_INDEX;
  if (stored.day !== bandDayOf(now)) return FIRST_INDEX;
  const storedSongIndex = songs.findIndex((song) => song.entryId === stored.entryId);
  if (storedSongIndex >= FIRST_INDEX) return storedSongIndex;
  return clampIndex(stored.index, songs.length);
}

export interface PracticePosition {
  readonly current: PracticeSong | null;
  readonly next: PracticeSong | null;
  readonly number: number;
  readonly count: number;
  readonly isLast: boolean;
  readonly isNextInAnotherSetlist: boolean;
  readonly currentSetlistName: string | null;
}

function countSetlists(songs: readonly PracticeSong[]): number {
  return new Set(songs.map((song) => song.setlistId)).size;
}

const ONE_SETLIST = 1;

// @FollowsBlueprint core-view-projection
export function describePracticePosition(
  songs: readonly PracticeSong[],
  index: number,
): PracticePosition {
  const current = songs[index] ?? null;
  const next = songs[index + 1] ?? null;
  return {
    current,
    next,
    number: index + 1,
    count: songs.length,
    isLast: next === null,
    isNextInAnotherSetlist: next !== null && next.setlistId !== current?.setlistId,
    currentSetlistName:
      current === null || countSetlists(songs) === ONE_SETLIST ? null : current.setlistName,
  };
}

export interface PracticeScreenEntry {
  readonly id: string;
  readonly songId: string;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
  readonly lineupOverride: Lineup | null;
}

export interface PracticeScreenInput {
  readonly songs: readonly PracticeSong[];
  readonly index: number;
  readonly entriesById: Readonly<Record<string, PracticeScreenEntry>>;
  readonly songsById: Readonly<Record<string, SetlistEditorSong>>;
  readonly transitionNotesByPair: Readonly<Record<string, string>>;
}

export interface PracticeCurrentView {
  readonly entry: PracticeScreenEntry;
  readonly setlistId: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly keyLabel: string | null;
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly transitionNote: string;
}

export interface PracticeNextView {
  readonly title: string;
  readonly artist: string;
  readonly setlistName: string | null;
}

export interface PracticeScreen {
  readonly position: PracticePosition;
  readonly current: PracticeCurrentView | null;
  readonly next: PracticeNextView | null;
}

function describeNext(
  position: PracticePosition,
  songsById: Readonly<Record<string, SetlistEditorSong>>,
): PracticeNextView | null {
  if (position.next === null) return null;
  const song = songsById[position.next.songId];
  return {
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    setlistName: position.isNextInAnotherSetlist ? position.next.setlistName : null,
  };
}

const LINE_SEPARATOR = ' · ';

export function formatPracticeNextLine(next: PracticeNextView | null): string | null {
  if (next === null) return null;
  return [next.title, next.artist, next.setlistName]
    .filter((part) => part !== null && part.length > 0)
    .join(LINE_SEPARATOR);
}

// @FollowsBlueprint core-view-projection-joining-two-lists
export function buildPracticeScreen(input: PracticeScreenInput): PracticeScreen {
  const position = describePracticePosition(input.songs, input.index);
  const next = describeNext(position, input.songsById);
  if (position.current === null) return { position, current: null, next };
  const entry = input.entriesById[position.current.entryId];
  if (entry === undefined) return { position, current: null, next };
  const song = input.songsById[entry.songId];
  const transitionNote =
    position.next === null
      ? ''
      : (input.transitionNotesByPair[transitionPairKey(entry.songId, position.next.songId)] ?? '');
  return {
    position,
    next,
    current: {
      entry,
      setlistId: position.current.setlistId,
      title: song?.title ?? '',
      artist: song?.artist ?? '',
      deezerAlbumId: song?.deezerAlbumId ?? null,
      keyLabel: entry.keyOverride ?? tonalityLabelFor(song),
      lineup: compactLineup(lineupOf(entry, input.songsById)),
      transitionNote,
    },
  };
}
