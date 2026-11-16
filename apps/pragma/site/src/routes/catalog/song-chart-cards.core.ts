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
  readonly cardId: string;
  readonly kind: SongChartKind;
  readonly chordproText: string;
  readonly pdfS3Key: string;
  readonly imageS3Key: string;
  readonly instrumentIds: readonly string[];
  readonly label: string;
}

const LOADED_CARD_ID_PREFIX = 'chart-';

function loadedCardId(index: number): string {
  return `${LOADED_CARD_ID_PREFIX}${String(index)}`;
}

export const BLANK_CHART_CARD: SongChartCardDraft = {
  cardId: loadedCardId(0),
  kind: 'none',
  chordproText: '',
  pdfS3Key: '',
  imageS3Key: '',
  instrumentIds: [],
  label: '',
};

// @FollowsBlueprint core-form-schema
export function cardFromChart(chart: SongChart, index: number): SongChartCardDraft {
  return {
    cardId: loadedCardId(index),
    kind: chart.kind,
    chordproText: chart.kind === 'chordpro' ? chart.text : '',
    pdfS3Key: chart.kind === 'pdf' ? chart.s3Key : '',
    imageS3Key: chart.kind === 'image' ? chart.s3Key : '',
    instrumentIds: chart.instrumentIds,
    label: chart.label ?? '',
  };
}

export function cardsFromCharts(charts: readonly SongChart[]): SongChartCardDraft[] {
  return charts.length === 0
    ? [BLANK_CHART_CARD]
    : charts.map((chart, index) => cardFromChart(chart, index));
}

function chartFromCard(card: SongChartCardDraft): SongChart | null {
  const assignment = { instrumentIds: [...card.instrumentIds], label: card.label };
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
  cardId: string,
): readonly SongChartCardDraft[] {
  return canAddChartCard(cards.length) ? [...cards, { ...BLANK_CHART_CARD, cardId }] : cards;
}

export function withoutChartCard(
  cards: readonly SongChartCardDraft[],
  cardId: string,
): readonly SongChartCardDraft[] {
  return cards.filter((card) => card.cardId !== cardId);
}

export function withChartCardChanged(
  cards: readonly SongChartCardDraft[],
  cardId: string,
  changes: Partial<Omit<SongChartCardDraft, 'cardId'>>,
): readonly SongChartCardDraft[] {
  return cards.map((card) => (card.cardId === cardId ? { ...card, ...changes } : card));
}

export function canMoveChartCard(index: number, cardCount: number, offset: number): boolean {
  const target = index + offset;
  return target >= 0 && target < cardCount;
}

export function moveChartCard(
  cards: readonly SongChartCardDraft[],
  cardId: string,
  offset: number,
): readonly SongChartCardDraft[] {
  const index = cards.findIndex((card) => card.cardId === cardId);
  const target = index + offset;
  const moved = cards[index];
  const displaced = cards[target];
  if (moved === undefined || displaced === undefined) return cards;
  return cards.map((card, current) => {
    if (current === index) return displaced;
    return current === target ? moved : card;
  });
}
