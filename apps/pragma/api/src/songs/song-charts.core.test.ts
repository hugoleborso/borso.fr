import { SONG_CHARTS_MAX_ENCODED_BYTES } from '@domain/input-limits.core';
import { describe, expect, it } from 'vitest';
import {
  dropInstrumentFromCharts,
  isWithinChartsByteBudget,
  listEachInstrumentOnce,
  resolveSongCharts,
} from './song-charts.core';

const GUITAR_ID = '6f0c5b8e-1d0a-4a57-8f43-0b7b0e0c0a01';
const PIANO_ID = '6f0c5b8e-1d0a-4a57-8f43-0b7b0e0c0a02';
const legacyChart = { kind: 'chordpro', text: '[C]Like the' } as const;
const guitarChart = {
  kind: 'chordpro',
  text: '{start_of_tab}',
  instrumentIds: [GUITAR_ID, PIANO_ID],
  label: 'Solo',
} as const;

// @FollowsBlueprint test-pure-unit
describe('resolveSongCharts', () => {
  it('lifts the old chart when the list was never written', () => {
    expect(resolveSongCharts(null, legacyChart)).toEqual([
      { kind: 'chordpro', text: '[C]Like the', instrumentIds: [], label: null },
    ]);
  });

  it('reads no chart when neither column holds one', () => {
    expect(resolveSongCharts(null, null)).toEqual([]);
  });

  it('keeps an empty list rather than falling back', () => {
    expect(resolveSongCharts([], legacyChart)).toEqual([]);
  });

  it('reads the list as stored when it was written', () => {
    const stored = [{ ...guitarChart, instrumentIds: [GUITAR_ID] }];
    expect(resolveSongCharts(stored, legacyChart)).toEqual(stored);
  });
});

describe('dropInstrumentFromCharts', () => {
  it('drops the instrument from every chart and keeps every chart', () => {
    const charts = [
      { ...guitarChart, instrumentIds: [GUITAR_ID, PIANO_ID] },
      { ...guitarChart, instrumentIds: [GUITAR_ID] },
    ];
    expect(dropInstrumentFromCharts(charts, GUITAR_ID)).toEqual([
      { ...guitarChart, instrumentIds: [PIANO_ID] },
      { ...guitarChart, instrumentIds: [] },
    ]);
  });
});

describe('listEachInstrumentOnce', () => {
  it('keeps the first place of an instrument named twice', () => {
    expect(listEachInstrumentOnce([PIANO_ID, GUITAR_ID, PIANO_ID])).toEqual([PIANO_ID, GUITAR_ID]);
  });
});

describe('isWithinChartsByteBudget', () => {
  it('counts the encoded bytes of the list, accents included', () => {
    const listOverhead = JSON.stringify([{ text: '' }]).length;
    const fittingText = 'a'.repeat(SONG_CHARTS_MAX_ENCODED_BYTES - listOverhead);
    expect(isWithinChartsByteBudget([{ text: fittingText }])).toBe(true);
    expect(isWithinChartsByteBudget([{ text: `${fittingText}a` }])).toBe(false);
    const accentedText = 'é'.repeat((SONG_CHARTS_MAX_ENCODED_BYTES - listOverhead) / 2 + 1);
    expect(isWithinChartsByteBudget([{ text: accentedText }])).toBe(false);
  });
});
