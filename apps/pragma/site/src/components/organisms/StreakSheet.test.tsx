import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { StreakSheet } from './StreakSheet';

const OPEN_FLAME = { days: 12, isTodayCounted: false, jokersLeftThisWeek: 1 };
const NO_FLAME = { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 };
const VIEW = {
  today: '2026-10-29',
  mine: OPEN_FLAME,
  band: { days: 4, isTodayCounted: true },
};

function renderSheet(view: typeof VIEW): HTMLElement {
  render(<StreakSheet view={view} onClose={vi.fn()} />);
  return screen.getByRole('dialog', { name: 'Flames' });
}

// @FollowsBlueprint test-component-render
describe('StreakSheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows my flame with the state of today and the jokers left, then the band', () => {
    const sheet = renderSheet(VIEW);
    expect(within(sheet).getByText('12')).toBeTruthy();
    expect(within(sheet).getByText('today still open')).toBeTruthy();
    expect(within(sheet).getByText('1 joker left this week')).toBeTruthy();
    expect(within(sheet).getByText('Band')).toBeTruthy();
    expect(within(sheet).getByText('today counted')).toBeTruthy();
  });

  it('pluralises the jokers left', () => {
    const sheet = renderSheet({ ...VIEW, mine: NO_FLAME });
    expect(within(sheet).getByText('3 jokers left this week')).toBeTruthy();
  });

  it('draws my flame as a large blaze and the band as a bonfire that flickers once today counts', () => {
    const sheet = renderSheet(VIEW);
    const marks = [...sheet.querySelectorAll('[data-sheet-body] section svg[data-flame-mark]')];
    expect(marks.map((mark) => mark.getAttribute('data-flame-mark'))).toEqual(['blaze', 'bonfire']);
    expect(marks.map((mark) => mark.getAttribute('data-tone'))).toEqual(['open', 'counted']);
    expect(marks[0]?.getAttribute('width')).toBe('40');
    expect(marks[0]?.getAttribute('class')).not.toContain('animate-flame-flicker');
    expect(marks[1]?.getAttribute('class')).toContain('motion-safe:animate-flame-flicker');
  });

  it('keeps the band bonfire still while today is open for the band', () => {
    const sheet = renderSheet({ ...VIEW, band: { days: 4, isTodayCounted: false } });
    const bonfire = sheet.querySelector('svg[data-flame-mark="bonfire"]');
    expect(bonfire?.getAttribute('data-tone')).toBe('open');
    expect(bonfire?.getAttribute('class')).not.toContain('animate-flame-flicker');
  });

  it('says No flame yet for a flame of zero days, and offers no action', () => {
    const sheet = renderSheet({
      ...VIEW,
      mine: NO_FLAME,
      band: { days: 0, isTodayCounted: false },
    });
    expect(within(sheet).getAllByText('No flame yet')).toHaveLength(2);
    expect(within(sheet).queryByRole('link')).toBeNull();
  });
});
