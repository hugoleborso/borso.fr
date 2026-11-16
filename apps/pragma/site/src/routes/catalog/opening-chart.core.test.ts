import { describe, expect, it } from 'vitest';
import {
  isChartSwitcherShown,
  isSwitchToAnotherChart,
  selectHeldInstrumentIds,
  selectOpeningChartIndex,
  selectShownChartIndex,
} from './opening-chart.core';

const EVERY_INSTRUMENT = { instrumentIds: [] };
const GUITAR = { instrumentIds: ['guitar'] };
const GUITAR_AND_PIANO = { instrumentIds: ['guitar', 'piano'] };
const BASS = { instrumentIds: ['bass'] };
const VOICE = { instrumentIds: ['voice'] };

// @FollowsBlueprint test-pure-unit
describe('selectOpeningChartIndex', () => {
  it('opens on a chart naming an instrument the member holds', () => {
    expect(selectOpeningChartIndex([BASS, GUITAR], ['guitar'])).toBe(1);
  });

  it('ranks a chart naming the instrument above a chart for every instrument', () => {
    expect(selectOpeningChartIndex([EVERY_INSTRUMENT, GUITAR], ['guitar'])).toBe(1);
  });

  it('opens on the first matching chart in order', () => {
    expect(selectOpeningChartIndex([GUITAR_AND_PIANO, GUITAR], ['guitar'])).toBe(0);
  });

  it('matches either instrument of a member holding two', () => {
    expect(selectOpeningChartIndex([BASS, VOICE, GUITAR], ['guitar', 'voice'])).toBe(1);
  });

  it('opens on the first chart for every instrument when no chart names the member', () => {
    expect(selectOpeningChartIndex([BASS, EVERY_INSTRUMENT, EVERY_INSTRUMENT], ['piano'])).toBe(1);
  });

  it('opens on the first chart when none matches and none is for every instrument', () => {
    expect(selectOpeningChartIndex([BASS, GUITAR], [])).toBe(0);
  });

  it('answers no chart for an empty list', () => {
    expect(selectOpeningChartIndex([], ['guitar'])).toBe(-1);
  });

  it('opens on the first chart while the member is not known yet', () => {
    expect(selectOpeningChartIndex([EVERY_INSTRUMENT, GUITAR], null)).toBe(0);
  });
});

describe('selectShownChartIndex', () => {
  it('shows the picked chart, and the opening chart with no pick or a pick past the end', () => {
    expect(selectShownChartIndex(1, 0, 2)).toBe(1);
    expect(selectShownChartIndex(null, 1, 2)).toBe(1);
    expect(selectShownChartIndex(2, 0, 2)).toBe(0);
  });
});

describe('isChartSwitcherShown', () => {
  it('shows the switcher from two charts', () => {
    expect(isChartSwitcherShown(1)).toBe(false);
    expect(isChartSwitcherShown(2)).toBe(true);
  });
});

describe('isSwitchToAnotherChart', () => {
  it('counts a tap on a pill other than the shown one', () => {
    expect(isSwitchToAnotherChart(1, 0)).toBe(true);
    expect(isSwitchToAnotherChart(0, 0)).toBe(false);
  });
});

describe('selectHeldInstrumentIds', () => {
  const lineup = { lea: ['guitar', 'voice'] };

  it('reads the instruments the member holds in the lineup', () => {
    expect(selectHeldInstrumentIds(lineup, { memberId: 'lea' })).toEqual(['guitar', 'voice']);
    expect(selectHeldInstrumentIds(lineup, { memberId: 'hugo' })).toEqual([]);
  });

  it('answers unknown while the member loads, and none when nobody is signed in', () => {
    expect(selectHeldInstrumentIds(lineup, undefined)).toBeNull();
    expect(selectHeldInstrumentIds(lineup, null)).toEqual([]);
  });
});
