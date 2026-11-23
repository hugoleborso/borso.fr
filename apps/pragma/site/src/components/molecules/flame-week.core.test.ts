import type { FlameWeekDay } from '@domain/practice-flame.core';
import { describe, expect, it } from 'vitest';
import { buildJokerPips, buildWeekCells } from './flame-week.core';

const TODAY = '2026-10-31';
const WEEK: readonly FlameWeekDay[] = [
  { day: '2026-10-26', state: 'active', isSessionDay: true },
  { day: '2026-10-27', state: 'missed', isSessionDay: false },
  { day: '2026-10-28', state: 'joker', isSessionDay: false },
  { day: '2026-10-29', state: 'joker', isSessionDay: false },
  { day: '2026-10-30', state: 'active', isSessionDay: false },
  { day: TODAY, state: 'open', isSessionDay: false },
  { day: '2026-11-01', state: 'future', isSessionDay: false },
];

// @FollowsBlueprint test-pure-unit
describe('buildWeekCells', () => {
  it('gives each day its tone, its caption and the words for its state', () => {
    expect(
      buildWeekCells(WEEK, TODAY, 'en').map((cell) => [
        cell.state,
        cell.isToday,
        cell.tone,
        cell.captionKey,
        cell.labelKey,
      ]),
    ).toEqual([
      ['active', false, 'counted', 'streaks.caption.session', 'streaks.dayState.active'],
      ['missed', false, null, null, 'streaks.dayState.missed'],
      ['joker', false, 'out', 'streaks.caption.joker', 'streaks.dayState.joker'],
      ['joker', false, 'out', 'streaks.caption.joker', 'streaks.dayState.joker'],
      ['active', false, 'counted', null, 'streaks.dayState.active'],
      ['open', true, 'open', 'streaks.caption.today', 'streaks.dayState.open'],
      ['future', false, null, null, 'streaks.dayState.future'],
    ]);
  });

  it('captions today rather than its session', () => {
    const [cell] = buildWeekCells(
      [{ day: TODAY, state: 'active', isSessionDay: true }],
      TODAY,
      'en',
    );
    expect(cell?.captionKey).toBe('streaks.caption.today');
    expect(cell?.day).toBe(TODAY);
  });

  it('writes the weekday letter and full name in the reader’s locale', () => {
    expect(buildWeekCells(WEEK, TODAY, 'en').map((cell) => cell.letter)).toEqual([
      'M',
      'T',
      'W',
      'T',
      'F',
      'S',
      'S',
    ]);
    expect(buildWeekCells(WEEK, TODAY, 'fr').map((cell) => cell.letter)).toEqual([
      'L',
      'M',
      'M',
      'J',
      'V',
      'S',
      'D',
    ]);
    expect(buildWeekCells(WEEK, TODAY, 'en')[0]?.weekdayName).toBe('Monday');
  });
});

describe('buildJokerPips', () => {
  it('puts each spent joker first, oldest first, named by the short weekday it saved', () => {
    expect(buildJokerPips(WEEK, 1, 'en')).toEqual([
      { id: '2026-10-28', kind: 'spent', weekdayName: 'Wed' },
      { id: '2026-10-29', kind: 'spent', weekdayName: 'Thu' },
      { id: 'left-0', kind: 'left', weekdayName: null },
    ]);
    expect(buildJokerPips(WEEK, 1, 'fr').map((pip) => pip.weekdayName)).toEqual([
      'mer.',
      'jeu.',
      null,
    ]);
  });

  it('draws one pip per joker left when none was spent', () => {
    expect(buildJokerPips([], 3, 'en').map((pip) => pip.id)).toEqual([
      'left-0',
      'left-1',
      'left-2',
    ]);
  });
});
