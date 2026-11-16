/** @Feature songs */

import { SONG_CHARTS_MAX } from '@domain/input-limits.core';
import { z } from 'zod';
import { convertChordsAboveLyrics } from './chords-above-lyrics.core';

export type SongChartKind = 'none' | 'chordpro' | 'pdf' | 'image';

const chartAssignmentShape = {
  instrumentIds: z.array(z.string()),
  label: z.string().nullable(),
};

export const songChartSchema = z.union([
  z.object({ kind: z.literal('chordpro'), text: z.string(), ...chartAssignmentShape }),
  z.object({ kind: z.literal('pdf'), s3Key: z.string(), ...chartAssignmentShape }),
  z.object({ kind: z.literal('image'), s3Key: z.string(), ...chartAssignmentShape }),
]);

export type SongChart = z.infer<typeof songChartSchema>;

export interface SongChartCardDraft {
  readonly kind: SongChartKind;
  readonly chordproText: string;
  readonly pdfS3Key: string;
  readonly imageS3Key: string;
  readonly instrumentIds: readonly string[];
  readonly label: string;
}

export const BLANK_CHART_CARD: SongChartCardDraft = {
  kind: 'none',
  chordproText: '',
  pdfS3Key: '',
  imageS3Key: '',
  instrumentIds: [],
  label: '',
};

// @FollowsBlueprint core-form-schema
export function cardFromChart(chart: SongChart): SongChartCardDraft {
  return {
    kind: chart.kind,
    chordproText: chart.kind === 'chordpro' ? chart.text : '',
    pdfS3Key: chart.kind === 'pdf' ? chart.s3Key : '',
    imageS3Key: chart.kind === 'image' ? chart.s3Key : '',
    instrumentIds: chart.instrumentIds,
    label: chart.label ?? '',
  };
}

export function cardsFromCharts(charts: readonly SongChart[]): SongChartCardDraft[] {
  return charts.length === 0 ? [BLANK_CHART_CARD] : charts.map(cardFromChart);
}

function chartFromCard(card: SongChartCardDraft): SongChart | null {
  const trimmedLabel = card.label.trim();
  const assignment = {
    instrumentIds: [...card.instrumentIds],
    label: trimmedLabel.length === 0 ? null : trimmedLabel,
  };
  if (card.kind === 'chordpro') {
    const text = convertChordsAboveLyrics(card.chordproText).chordPro;
    return text.length === 0 ? null : { kind: 'chordpro', text, ...assignment };
  }
  if (card.kind === 'pdf' && card.pdfS3Key.length > 0) {
    return { kind: 'pdf', s3Key: card.pdfS3Key, ...assignment };
  }
  if (card.kind === 'image' && card.imageS3Key.length > 0) {
    return { kind: 'image', s3Key: card.imageS3Key, ...assignment };
  }
  return null;
}

export function chartsFromCards(cards: readonly SongChartCardDraft[]): SongChart[] {
  return cards.flatMap((card) => {
    const chart = chartFromCard(card);
    return chart === null ? [] : [chart];
  });
}

export function canAddChartCard(cardCount: number): boolean {
  return cardCount < SONG_CHARTS_MAX;
}

export function withChartCardAdded(
  cards: readonly SongChartCardDraft[],
): readonly SongChartCardDraft[] {
  return canAddChartCard(cards.length) ? [...cards, BLANK_CHART_CARD] : cards;
}

export function withoutChartCard(
  cards: readonly SongChartCardDraft[],
  index: number,
): readonly SongChartCardDraft[] {
  return cards.filter((_, current) => current !== index);
}

export function withChartCardChanged(
  cards: readonly SongChartCardDraft[],
  index: number,
  changes: Partial<SongChartCardDraft>,
): readonly SongChartCardDraft[] {
  return cards.map((card, current) => (current === index ? { ...card, ...changes } : card));
}

export function canMoveChartCard(index: number, cardCount: number, offset: number): boolean {
  const target = index + offset;
  return target >= 0 && target < cardCount;
}

export function moveChartCard(
  cards: readonly SongChartCardDraft[],
  index: number,
  offset: number,
): readonly SongChartCardDraft[] {
  const target = index + offset;
  const moved = cards[index];
  const displaced = cards[target];
  if (moved === undefined || displaced === undefined) return cards;
  return cards.map((card, current) => {
    if (current === index) return displaced;
    return current === target ? moved : card;
  });
}
