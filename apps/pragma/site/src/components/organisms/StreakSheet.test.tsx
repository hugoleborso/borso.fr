import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { StreakSheet } from './StreakSheet';

const LEA = {
  memberId: 'member-lea',
  firstName: 'Léa',
  color: '#1f3a5f',
  flame: { days: 12, isTodayCounted: false, jokersLeftThisWeek: 1 },
};
const TOM = {
  memberId: 'member-tom',
  firstName: 'Tom',
  color: '#f4d35e',
  flame: { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 },
};
const MARC = {
  memberId: 'member-marc',
  firstName: 'Marc',
  color: '#e07a5f',
  flame: { days: 5, isTodayCounted: true, jokersLeftThisWeek: 3 },
};
const VIEW = {
  today: '2026-10-29',
  mine: LEA.flame,
  band: { days: 4, isTodayCounted: true },
  members: [LEA, TOM],
};
const RENDERED_NAVY = 'rgb(31, 58, 95)';

function renderSheet(view: typeof VIEW): HTMLElement {
  render(
    <MemoryRouter>
      <StreakSheet view={view} onClose={vi.fn()} />
    </MemoryRouter>,
  );
  return screen.getByRole('dialog', { name: 'Flames' });
}

// @FollowsBlueprint test-component-render
describe('StreakSheet', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows my flame with the state of today and the jokers left, then the band', () => {
    const sheet = renderSheet(VIEW);
    expect(within(sheet).getAllByText('12')).toHaveLength(2);
    expect(within(sheet).getAllByText('today still open')).toHaveLength(2);
    expect(within(sheet).getByText('1 joker left this week')).toBeTruthy();
    expect(within(sheet).getByText('Band')).toBeTruthy();
    expect(within(sheet).getByText('today counted')).toBeTruthy();
  });

  it('pluralises the jokers left', () => {
    const sheet = renderSheet({ ...VIEW, mine: TOM.flame });
    expect(within(sheet).getByText('3 jokers left this week')).toBeTruthy();
  });

  it('lists each member as a dot in their stored colour, their first name, their flame', () => {
    const sheet = renderSheet({ ...VIEW, members: [LEA, TOM, MARC] });
    const rows = within(sheet).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Léa12today still open',
      'Tom0No flame yet',
      'Marc5today counted',
    ]);
    const leaDot = rows[0]?.firstElementChild;
    expect(leaDot instanceof HTMLElement ? leaDot.style.backgroundColor : '').toBe(RENDERED_NAVY);
    expect(leaDot?.textContent).toBe('');
  });

  it.each([
    { memberIndex: 0, present: ['text-accent', 'fill-accent-soft'], absent: ['fill-accent'] },
    { memberIndex: 1, present: ['text-ink-faint'], absent: ['text-accent', 'fill-accent'] },
    { memberIndex: 2, present: ['text-accent', 'fill-accent'], absent: ['fill-accent-soft'] },
  ])('tones the flame of row $memberIndex with $present', ({ memberIndex, present, absent }) => {
    const sheet = renderSheet({ ...VIEW, members: [LEA, TOM, MARC] });
    const flame = within(sheet).getAllByRole('listitem')[memberIndex]?.querySelector('svg');
    const classes = (flame?.getAttribute('class') ?? '').split(' ');
    expect(classes).toEqual(expect.arrayContaining(present));
    expect(classes.filter((name) => absent.includes(name))).toEqual([]);
  });

  it('says No flame yet for a flame of zero days', () => {
    const sheet = renderSheet({ ...VIEW, mine: TOM.flame, members: [TOM] });
    expect(within(sheet).getAllByText('No flame yet')).toHaveLength(2);
  });

  it('sends Study a song to the songs left to learn', () => {
    const sheet = renderSheet(VIEW);
    expect(within(sheet).getByRole('link', { name: 'Study a song' }).getAttribute('href')).toBe(
      '/catalog?filter=learning',
    );
  });
});
