import { describe, expect, it } from 'vitest';
import {
  buildStreaksView,
  collectSessionDays,
  firstLookbackDay,
  projectStreaksForTool,
} from './streaks.core';

const TODAY = '2026-10-29';
const YESTERDAY = '2026-10-28';
const TWO_DAYS_AGO = '2026-10-27';
const FOUR_DAYS_AGO = '2026-10-25';

// @FollowsBlueprint test-pure-unit
describe('buildStreaksView', () => {
  it('counts the session days for my flame and the band’s', () => {
    expect(buildStreaksView({ today: TODAY, sessionDays: new Set([TODAY, YESTERDAY]) })).toEqual({
      today: TODAY,
      mine: { days: 2, isTodayCounted: true, jokersLeftThisWeek: 3 },
      band: { days: 2, isTodayCounted: true },
    });
  });

  it('bridges a gap between sessions with jokers for my flame, never for the band’s', () => {
    const view = buildStreaksView({
      today: TODAY,
      sessionDays: new Set([YESTERDAY, FOUR_DAYS_AGO]),
    });
    expect(view.mine).toEqual({ days: 2, isTodayCounted: false, jokersLeftThisWeek: 1 });
    expect(view.band).toEqual({ days: 1, isTodayCounted: false });
  });

  it('answers no flame without a session', () => {
    expect(buildStreaksView({ today: TODAY, sessionDays: new Set() })).toEqual({
      today: TODAY,
      mine: { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 },
      band: { days: 0, isTodayCounted: false },
    });
  });
});

describe('collectSessionDays', () => {
  it('keeps the Paris day of each session from the first day to today', () => {
    const firstDay = '2025-09-24';
    const days = collectSessionDays(
      [
        { date: new Date('2026-10-28T23:30:00Z') },
        { date: new Date('2026-10-28T22:30:00Z') },
        { date: new Date('2025-09-24T10:00:00Z') },
        { date: new Date('2025-09-23T10:00:00Z') },
      ],
      firstDay,
      TODAY,
    );
    expect([...days].sort()).toEqual([firstDay, YESTERDAY, TODAY]);
  });

  it('leaves out a session dated after today', () => {
    expect(
      collectSessionDays([{ date: new Date('2026-10-30T18:00:00Z') }], '2025-09-24', TODAY).size,
    ).toBe(0);
  });
});

describe('projectStreaksForTool', () => {
  it('keeps both flames and drops the day', () => {
    const view = buildStreaksView({ today: TODAY, sessionDays: new Set([TWO_DAYS_AGO]) });
    expect(projectStreaksForTool(view)).toEqual({
      mine: { days: 1, isTodayCounted: false, jokersLeftThisWeek: 2 },
      band: { days: 0, isTodayCounted: false },
    });
  });
});

describe('firstLookbackDay', () => {
  it('reads 400 calendar days back from today', () => {
    expect(firstLookbackDay(TODAY)).toBe('2025-09-24');
  });
});
