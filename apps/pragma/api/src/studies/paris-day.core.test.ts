import { describe, expect, it } from 'vitest';
import { daysBetween, mondayOfWeek, parisCalendarDay, shiftCalendarDay } from './paris-day.core';

// @FollowsBlueprint test-pure-unit
describe('paris-day.core', () => {
  describe('parisCalendarDay', () => {
    it('moves to the next day at 22:00 UTC in summer, when Paris is two hours ahead', () => {
      expect(parisCalendarDay(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
      expect(parisCalendarDay(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
    });

    it('moves to the next day at 23:00 UTC in winter, when Paris is one hour ahead', () => {
      expect(parisCalendarDay(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-15');
      expect(parisCalendarDay(new Date('2026-01-15T23:00:00Z'))).toBe('2026-01-16');
    });

    it('keeps the day across both daylight saving switches', () => {
      expect(parisCalendarDay(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29');
      expect(parisCalendarDay(new Date('2026-10-25T00:30:00Z'))).toBe('2026-10-25');
      expect(parisCalendarDay(new Date('2026-10-25T22:59:00Z'))).toBe('2026-10-25');
    });
  });

  describe('shiftCalendarDay', () => {
    it('crosses a month and a year boundary', () => {
      expect(shiftCalendarDay('2026-03-01', -1)).toBe('2026-02-28');
      expect(shiftCalendarDay('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('is not shortened by the spring daylight saving switch', () => {
      expect(shiftCalendarDay('2026-03-28', 1)).toBe('2026-03-29');
      expect(shiftCalendarDay('2026-03-30', -1)).toBe('2026-03-29');
    });
  });

  describe('daysBetween', () => {
    it('counts whole calendar days, signed', () => {
      expect(daysBetween('2026-10-12', '2026-10-05')).toBe(7);
      expect(daysBetween('2026-10-05', '2026-10-12')).toBe(-7);
      expect(daysBetween('2026-10-12', '2026-10-12')).toBe(0);
    });
  });

  describe('mondayOfWeek', () => {
    it('returns the same day on a Monday', () => {
      expect(mondayOfWeek('2026-10-12')).toBe('2026-10-12');
    });

    it('goes back to the Monday from mid-week and from a Sunday', () => {
      expect(mondayOfWeek('2026-10-14')).toBe('2026-10-12');
      expect(mondayOfWeek('2026-10-18')).toBe('2026-10-12');
    });
  });
});
