import { describe, expect, it } from 'vitest';
import {
  formatCapacity,
  formatClockTime,
  formatDueDate,
  formatSessionDate,
  isDueDatePast,
} from './formatters.utils';

// @FollowsBlueprint test-pure-unit
describe('formatters.utils', () => {
  describe('formatSessionDate', () => {
    it('formats an ISO string in english', () => {
      const formatted = formatSessionDate('2025-09-13T18:30:00Z', 'en-GB');
      expect(formatted).toMatch(/Sat/);
      expect(formatted).toMatch(/2025/);
    });

    it('formats an ISO string in french', () => {
      const formatted = formatSessionDate('2025-09-13T18:30:00Z', 'fr-FR');
      expect(formatted).toMatch(/2025/);
    });

    it('returns the input untouched when the ISO string is malformed', () => {
      expect(formatSessionDate('not-a-date', 'en-GB')).toBe('not-a-date');
    });
  });

  describe('formatCapacity', () => {
    it('returns an em-dash on null', () => {
      expect(formatCapacity(null)).toBe('—');
    });

    it('returns an em-dash on undefined', () => {
      expect(formatCapacity(undefined)).toBe('—');
    });

    it('returns an em-dash on negative values', () => {
      expect(formatCapacity(-1)).toBe('—');
    });

    it('returns the digits on small numbers', () => {
      expect(formatCapacity(0)).toBe('0');
      expect(formatCapacity(120)).toBe('120');
    });

    it('groups thousands with a thin space', () => {
      expect(formatCapacity(1_000)).toBe('1 000');
      expect(formatCapacity(1_200)).toBe('1 200');
      expect(formatCapacity(1_200_000)).toBe('1 200 000');
    });
  });
});

describe('formatDueDate', () => {
  it('prints a day and a month, and nothing at all without a date', () => {
    expect(formatDueDate('2026-05-01T12:00:00.000Z', 'en-GB')).toBe('1 May');
    expect(formatDueDate(null, 'en-GB')).toBeNull();
  });

  it('gives back what it was handed when that is not a date', () => {
    expect(formatDueDate('next tuesday', 'en-GB')).toBe('next tuesday');
  });
});

describe('isDueDatePast', () => {
  const NOW = new Date('2026-05-10T00:00:00.000Z').getTime();

  it('is true only for a date already gone', () => {
    expect(isDueDatePast('2026-05-01T12:00:00.000Z', NOW)).toBe(true);
    expect(isDueDatePast('2026-06-01T12:00:00.000Z', NOW)).toBe(false);
  });

  it('is not past on the very moment it is due', () => {
    expect(isDueDatePast('2026-05-10T00:00:00.000Z', NOW)).toBe(false);
  });

  it('is false for a task with no date, and for text that is not one', () => {
    expect(isDueDatePast(null, NOW)).toBe(false);
    expect(isDueDatePast('soon', NOW)).toBe(false);
  });
});

describe('formatClockTime', () => {
  it('reads the wall clock a round was opened at, in the reader locale', () => {
    const label = formatClockTime('2026-08-31T20:45:00.000Z', 'en-GB');
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  it('hands back what it was given when the text is not a date', () => {
    expect(formatClockTime('not a date', 'en-GB')).toBe('not a date');
  });
});
