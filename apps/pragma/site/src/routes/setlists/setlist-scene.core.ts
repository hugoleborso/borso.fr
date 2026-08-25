/** @Feature setlists */

import { buildTonalityLabel } from '../catalog/tonality-label.utils';

export interface SceneEntryInput {
  readonly id: string;
  readonly songId: string;
  readonly energy: number | null;
  readonly keyOverride: string | null;
  readonly capo: number | null;
}

export interface SceneSongInput {
  readonly title: string;
  readonly artist: string;
  readonly tonalityStart: string | null;
  readonly tonalityEnd: string | null;
  readonly baseEnergy: number | null;
}

export type SceneKeyCommand = 'next' | 'previous';

export type ScenePillState = 'done' | 'current' | 'next' | 'upcoming';

export interface ScenePill {
  readonly entryId: string;
  readonly ordinal: string;
  readonly title: string | null;
  readonly subtitle: string;
  readonly state: ScenePillState;
}

export interface SceneHeadline {
  readonly title: string | null;
  readonly artist: string;
  readonly tonalityLabel: string | null;
  readonly energy: number | null;
  readonly capo: number | null;
}

const COMMAND_BY_KEY = {
  ArrowRight: 'next',
  PageDown: 'next',
  ArrowLeft: 'previous',
  PageUp: 'previous',
} as const satisfies Readonly<Record<string, SceneKeyCommand>>;

const STEP_BY_COMMAND = {
  next: 1,
  previous: -1,
} as const satisfies Readonly<Record<SceneKeyCommand, number>>;

const SUBTITLE_SEPARATOR = ' · ';
const ORDINAL_DIGITS = 2;
const ORDINAL_PAD = '0';
const FULL_PERCENT = 100;

function isKnownKey(key: string): key is keyof typeof COMMAND_BY_KEY {
  return key in COMMAND_BY_KEY;
}

// @FollowsBlueprint core-lookup-table
export function selectSceneKeyCommand(key: string): SceneKeyCommand | null {
  return isKnownKey(key) ? COMMAND_BY_KEY[key] : null;
}

export function clampSceneIndex(index: number, entryCount: number): number {
  return Math.max(0, Math.min(entryCount - 1, index));
}

export function resolveSceneIndex(
  command: SceneKeyCommand,
  currentIndex: number,
  entryCount: number,
): number {
  return clampSceneIndex(currentIndex + STEP_BY_COMMAND[command], entryCount);
}

function padOrdinal(value: number): string {
  return String(value).padStart(ORDINAL_DIGITS, ORDINAL_PAD);
}

export function formatSceneOrdinal(index: number): string {
  return padOrdinal(index + 1);
}

export function formatScenePosition(index: number, entryCount: number): string {
  return `${formatSceneOrdinal(index)} / ${padOrdinal(entryCount)}`;
}

export function computeSceneProgressPercent(index: number, entryCount: number): number {
  if (entryCount === 0) return 0;
  return ((clampSceneIndex(index, entryCount) + 1) / entryCount) * FULL_PERCENT;
}

function selectPillState(index: number, currentIndex: number): ScenePillState {
  if (index === currentIndex) return 'current';
  if (index < currentIndex) return 'done';
  if (index === currentIndex + 1) return 'next';
  return 'upcoming';
}

export function buildScenePills(
  entries: readonly SceneEntryInput[],
  songsById: Readonly<Record<string, SceneSongInput | undefined>>,
  currentIndex: number,
): readonly ScenePill[] {
  return entries.map((entry, index) => {
    const song = songsById[entry.songId];
    return {
      entryId: entry.id,
      ordinal: formatSceneOrdinal(index),
      title: song?.title ?? null,
      subtitle: composeSceneSubtitle(song?.artist ?? '', selectTonalityLabel(entry, song)),
      state: selectPillState(index, currentIndex),
    };
  });
}

export function composeSceneSubtitle(artist: string, tonalityLabel: string | null): string {
  return [artist, tonalityLabel ?? ''].filter((part) => part !== '').join(SUBTITLE_SEPARATOR);
}

function selectTonalityLabel(
  entry: SceneEntryInput,
  song: SceneSongInput | undefined,
): string | null {
  if (entry.keyOverride !== null) return entry.keyOverride;
  if (song === undefined) return null;
  return buildTonalityLabel(song.tonalityStart, song.tonalityEnd);
}

export function buildSceneHeadline(
  entry: SceneEntryInput | undefined,
  song: SceneSongInput | undefined,
): SceneHeadline {
  if (entry === undefined) {
    return { title: null, artist: '', tonalityLabel: null, energy: null, capo: null };
  }
  return {
    title: song?.title ?? null,
    artist: song?.artist ?? '',
    tonalityLabel: selectTonalityLabel(entry, song),
    energy: entry.energy ?? song?.baseEnergy ?? null,
    capo: entry.capo,
  };
}
