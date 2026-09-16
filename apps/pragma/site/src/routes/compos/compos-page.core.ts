/** @Feature compositions */

import type { SongOrigin } from '@domain/song-origin.core';

export type CompositionChart =
  | { readonly kind: 'chordpro'; readonly text: string }
  | { readonly kind: 'pdf'; readonly s3Key: string }
  | { readonly kind: 'image'; readonly s3Key: string };

export interface UploadedChart {
  readonly kind: 'pdf' | 'image';
  readonly s3Key: string;
}

export interface CompositionShape {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly origin: SongOrigin;
  readonly status: 'idea' | 'wip' | 'rehearsed' | 'concert_ready';
  readonly chart: CompositionChart | null;
  readonly tonalityStart: string | null;
  readonly structureNotes: string;
  readonly gimmickNotes: string;
  readonly notes: string;
  readonly defaultLineup: Readonly<Record<string, readonly string[]>>;
  readonly createdAt: string;
}

export function selectChordProSource(chart: CompositionChart | null): string | null {
  return chart?.kind === 'chordpro' ? chart.text : null;
}

export function selectUploadedChart(chart: CompositionChart | null): UploadedChart | null {
  if (chart === null || chart.kind === 'chordpro') return null;
  return { kind: chart.kind, s3Key: chart.s3Key };
}

export function countLineupMembers(
  defaultLineup: Readonly<Record<string, readonly string[]>>,
): number {
  return Object.values(defaultLineup).filter((instrumentIds) => instrumentIds.length > 0).length;
}

// @FollowsBlueprint core-view-intent
export function selectComposition<Composition extends { readonly id: string }>(
  compositions: readonly Composition[],
  selectedId: string | null,
): Composition | null {
  const [firstComposition] = compositions;
  if (firstComposition === undefined) return null;
  return compositions.find((composition) => composition.id === selectedId) ?? firstComposition;
}
