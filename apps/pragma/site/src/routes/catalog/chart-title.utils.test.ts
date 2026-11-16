import { describe, expect, it } from 'vitest';
import { describeChordChartTitle } from './chart-title.utils';

const EVERY_INSTRUMENT_TEXT = 'All instruments';
const INSTRUMENTS = [
  { id: 'guitar', name: 'Guitare' },
  { id: 'piano', name: 'Clavier' },
];

// @FollowsBlueprint test-pure-unit
describe('describeChordChartTitle', () => {
  it('names the instruments in instrument order, joined by a plus', () => {
    const chart = { instrumentIds: ['piano', 'guitar'], label: null };
    expect(describeChordChartTitle(chart, INSTRUMENTS, EVERY_INSTRUMENT_TEXT)).toBe(
      'Guitare + Clavier',
    );
  });

  it('reads All instruments for a chart naming none', () => {
    const chart = { instrumentIds: [], label: null };
    expect(describeChordChartTitle(chart, INSTRUMENTS, EVERY_INSTRUMENT_TEXT)).toBe(
      EVERY_INSTRUMENT_TEXT,
    );
  });

  it('adds the label after a middle dot', () => {
    const chart = { instrumentIds: ['guitar'], label: 'Solo' };
    expect(describeChordChartTitle(chart, INSTRUMENTS, EVERY_INSTRUMENT_TEXT)).toBe(
      'Guitare · Solo',
    );
  });

  it('skips an instrument id no instrument holds any more', () => {
    const chart = { instrumentIds: ['gone', 'piano'], label: null };
    expect(describeChordChartTitle(chart, INSTRUMENTS, EVERY_INSTRUMENT_TEXT)).toBe('Clavier');
  });

  it('reads All instruments when no name is left', () => {
    const chart = { instrumentIds: ['gone'], label: 'Intro' };
    expect(describeChordChartTitle(chart, INSTRUMENTS, EVERY_INSTRUMENT_TEXT)).toBe(
      'All instruments · Intro',
    );
  });
});
