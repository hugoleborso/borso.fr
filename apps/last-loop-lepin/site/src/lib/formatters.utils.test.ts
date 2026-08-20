import { describe, expect, it } from 'vitest';
import {
  formatBibNumber,
  formatClockTime,
  formatElevationMetres,
  formatHourMinute,
  formatKilobytes,
  formatKilometres,
  formatLoopDuration,
  formatLoopIndex,
  formatPace,
  formatPercent,
  formatRaceDate,
  formatTimeOfDay,
} from './formatters.utils';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

// @FollowsBlueprint test-pure-unit
describe('formatHourMinute', () => {
  it('pads the hour and the minute to two digits', () => {
    const instant = new Date(2026, 5, 13, 6, 4);
    expect(formatHourMinute(instant)).toBe('06:04');
  });

  it('keeps a two digit hour as it is', () => {
    expect(formatHourMinute(new Date(2026, 5, 13, 22, 31))).toBe('22:31');
  });
});

describe('formatRaceDate', () => {
  it('spells the month out in French', () => {
    expect(formatRaceDate(new Date(2026, 5, 13), 'fr-FR')).toBe('13 juin 2026');
  });

  it('spells the month out in English', () => {
    expect(formatRaceDate(new Date(2026, 5, 13), 'en-GB')).toBe('13 June 2026');
  });
});

describe('formatClockTime', () => {
  it('includes the seconds', () => {
    expect(formatClockTime(new Date(2026, 5, 13, 7, 5, 9), 'fr-FR')).toBe('07:05:09');
  });

  it('pads the hour to two digits in a locale that would drop the leading zero, which is what lines the chips up in a column', () => {
    expect(formatClockTime(new Date(2026, 5, 13, 7, 5, 9), 'en-US')).toBe('07:05:09 AM');
  });
});

describe('formatTimeOfDay', () => {
  it('formats an instant in the given locale', () => {
    expect(formatTimeOfDay(new Date(2026, 5, 13, 7, 5, 9), 'fr-FR')).toBe('07:05:09');
  });
});

describe('formatLoopDuration', () => {
  it('returns an em dash for a negative duration', () => {
    expect(formatLoopDuration(-1)).toBe('—');
  });

  it('formats zero as a padded pair of zeroes', () => {
    expect(formatLoopDuration(0)).toBe('00:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatLoopDuration(63 * SECOND_MS)).toBe('01:03');
  });

  it('keeps counting in minutes past an hour', () => {
    expect(formatLoopDuration(61 * MINUTE_MS)).toBe('61:00');
  });
});

describe('formatPace', () => {
  it('returns an em dash when there is no duration', () => {
    expect(formatPace(null)).toBe('—');
  });

  it('returns an em dash for a zero duration', () => {
    expect(formatPace(0)).toBe('—');
  });

  it('returns an em dash for a negative duration', () => {
    expect(formatPace(-5)).toBe('—');
  });

  it('formats minutes and padded seconds', () => {
    expect(formatPace(58 * MINUTE_MS + 2 * SECOND_MS)).toBe('58\'02"');
  });
});

describe('formatKilometres', () => {
  it('renders metres as kilometres with two decimals', () => {
    expect(formatKilometres(5_800)).toBe('5.80');
  });
});

describe('formatElevationMetres', () => {
  it('rounds to the nearest metre', () => {
    expect(formatElevationMetres(249.6)).toBe('250');
  });
});

describe('formatKilobytes', () => {
  it('renders bytes as kilobytes with one decimal', () => {
    expect(formatKilobytes(2_048)).toBe('2.0');
  });
});

describe('formatPercent', () => {
  it('rounds a fraction to a whole percentage', () => {
    expect(formatPercent(0.4567)).toBe('46');
  });
});

describe('formatBibNumber', () => {
  it('returns an em dash when the runner has no bib', () => {
    expect(formatBibNumber(null, 3)).toBe('—');
  });

  it('pads the bib to the requested width', () => {
    expect(formatBibNumber(7, 3)).toBe('007');
  });

  it('leaves a bib wider than the requested width alone', () => {
    expect(formatBibNumber(1234, 3)).toBe('1234');
  });
});

describe('formatLoopIndex', () => {
  it('pads a single digit loop index', () => {
    expect(formatLoopIndex(3)).toBe('03');
  });
});
