import type { FlameWeekDay } from '@domain/practice-flame.core';
import { cleanup, render, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { StreakSheet } from './StreakSheet';

const TODAY = '2026-10-31';
const WEEK: readonly FlameWeekDay[] = [
  { day: '2026-10-26', state: 'active', isSessionDay: false },
  { day: '2026-10-27', state: 'active', isSessionDay: true },
  { day: '2026-10-28', state: 'joker', isSessionDay: false },
  { day: '2026-10-29', state: 'missed', isSessionDay: false },
  { day: '2026-10-30', state: 'active', isSessionDay: false },
  { day: TODAY, state: 'open', isSessionDay: false },
  { day: '2026-11-01', state: 'future', isSessionDay: false },
];
const MY_FLAME = { days: 5, isTodayCounted: false, jokersLeftThisWeek: 2, week: WEEK };
const QUIET_WEEK = WEEK.map((weekDay): FlameWeekDay => ({ ...weekDay, state: 'missed' }));

function memberOf(firstName: string, color: string, days: number, isTodayCounted: boolean) {
  return {
    memberId: `member-${firstName}`,
    firstName,
    color,
    flame: { days, isTodayCounted, jokersLeftThisWeek: 3, week: QUIET_WEEK },
  };
}

const VIEW = {
  today: TODAY,
  mine: MY_FLAME,
  band: { days: 12, isTodayCounted: true },
  members: [
    memberOf('Marc', '#e07a5f', 0, false),
    memberOf('Sarah', '#f4d35e', 3, false),
    memberOf('Léa', '#3d6b38', 1, true),
    memberOf('Hugo', '#1f3a5f', 5, true),
  ],
};
const RENDERED_NAVY = 'rgb(31, 58, 95)';

function renderSheet(view: typeof VIEW = VIEW): HTMLElement {
  render(<StreakSheet view={view} onClose={vi.fn()} />);
  return screen.getByRole('dialog', { name: i18next.t('streaks.sheetTitle') });
}

function getListAt(sheet: HTMLElement, index: number): HTMLElement {
  const list = within(sheet).getAllByRole('list')[index];
  if (list === undefined) throw new Error(`no list at ${index}`);
  return list;
}

// @FollowsBlueprint test-component-render
describe('StreakSheet', () => {
  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('shows my flame with its unit, then the band’s, as two large marks', () => {
    const sheet = renderSheet();
    const mine = within(sheet).getByRole('region', { name: 'Your flame' });
    const band = within(sheet).getByRole('region', { name: 'The band' });
    expect(mine.textContent).toBe('Your flame5 days');
    expect(band.textContent).toBe('The band12 days');
    const marks = [mine, band].map((hero) => hero.querySelector('svg[data-flame-mark]'));
    expect(marks.map((mark) => mark?.getAttribute('data-flame-mark'))).toEqual([
      'blaze',
      'bonfire',
    ]);
    expect(marks.map((mark) => mark?.getAttribute('data-tone'))).toEqual(['open', 'counted']);
    expect(marks.map((mark) => mark?.getAttribute('width'))).toEqual(['40', '40']);
    expect(marks[1]?.getAttribute('class')).toContain('motion-safe:animate-flame-flicker');
  });

  it('pluralises one day', () => {
    const sheet = renderSheet({ ...VIEW, band: { days: 1, isTodayCounted: true } });
    expect(within(sheet).getByRole('region', { name: 'The band' }).textContent).toBe(
      'The band1 day',
    );
  });

  it('draws the seven days of the week with their state, caption and name', () => {
    const sheet = renderSheet();
    const week = getListAt(sheet, 0);
    const days = within(week).getAllByRole('listitem');
    expect(
      days.map((day) => day.querySelector('[data-day-state]')?.getAttribute('data-day-state')),
    ).toEqual(['active', 'active', 'joker', 'missed', 'active', 'open', 'future']);
    expect(days.map((day) => day.textContent)).toEqual([
      'Monday, countedM',
      'Tuesday, countedTsession',
      'Wednesday, saved by a jokerWjoker',
      'Thursday, missedT',
      'Friday, countedF',
      'Saturday, not yet todayStoday',
      'Sunday, still to comeS',
    ]);
    const today = days[5]?.querySelector('[data-day-state]');
    expect(today?.getAttribute('class')).toContain('border-accent');
    expect(today?.querySelector('svg')?.getAttribute('data-tone')).toBe('open');
    expect(days[2]?.querySelector('svg')?.getAttribute('data-tone')).toBe('out');
    expect(days[0]?.querySelector('svg')?.getAttribute('data-tone')).toBe('counted');
    expect(days[3]?.querySelector('svg')).toBeNull();
    expect(days[6]?.querySelector('svg')).toBeNull();
  });

  it('counts the jokers left, and labels each spent joker with the day it saved', () => {
    const sheet = renderSheet();
    const card = within(sheet).getByRole('group', { name: 'Jokers · 2 of 3' });
    const pips = [...card.querySelectorAll('[data-joker]')];
    expect(pips.map((pip) => [pip.getAttribute('data-joker'), pip.textContent])).toEqual([
      ['spent', 'Wed'],
      ['left', ''],
      ['left', ''],
    ]);
    expect(within(card).getByText('Back on Monday')).toBeTruthy();
  });

  it('lists every member under the band, longest flame first, and names who has not come today', () => {
    const sheet = renderSheet();
    const band = within(sheet).getByRole('region', { name: 'The band' });
    const members = getListAt(sheet, 1);
    expect(band.compareDocumentPosition(members)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    const rows = within(members).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Hugo55 days',
      'Sarahnot yet today33 days',
      'Léa11 day',
      'Marcnot yet today00 days',
    ]);
    const hugoDot = rows[0]?.firstElementChild;
    expect(hugoDot instanceof HTMLElement ? hugoDot.style.backgroundColor : '').toBe(RENDERED_NAVY);
    expect(rows.map((row) => row.querySelector('svg')?.getAttribute('data-tone'))).toEqual([
      'counted',
      'open',
      'counted',
      'out',
    ]);
    expect(rows[0]?.getAttribute('class')).toContain('min-h-11');
  });

  it('writes the week and the jokers in French on a French reader', async () => {
    await i18next.changeLanguage('fr');
    const sheet = renderSheet();
    const week = getListAt(sheet, 0);
    expect(
      within(week)
        .getAllByRole('listitem')
        .map((day) => day.querySelector('[aria-hidden="true"]')?.textContent),
    ).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
    expect(within(sheet).getByRole('group', { name: 'Jokers · 2 sur 3' })).toBeTruthy();
    expect(within(sheet).getByText('mer.')).toBeTruthy();
    expect(within(sheet).getByText('auj.')).toBeTruthy();
  });
});
