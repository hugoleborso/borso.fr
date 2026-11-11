import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { TodayIndex, type TodayIndexProps } from './TodayIndex';

const COUNTS: TodayIndexProps = {
  pendingProposalCount: 3,
  overdueTodoCount: 2,
  owedCommitmentCount: 4,
  awaitedCommitmentCount: 1,
  readyDraftCount: 5,
  reconnectCount: 6,
  dueRecurringTaskCount: 7,
};

const NO_COUNTS: TodayIndexProps = {
  pendingProposalCount: 0,
  overdueTodoCount: 0,
  owedCommitmentCount: 0,
  awaitedCommitmentCount: 0,
  readyDraftCount: 0,
  reconnectCount: 0,
  dueRecurringTaskCount: 0,
};

const ALERT_CLASS = 'bg-danger-soft';

function renderIndex(counts: TodayIndexProps): HTMLElement[] {
  render(
    <MemoryRouter>
      <TodayIndex {...counts} />
    </MemoryRouter>,
  );
  return screen.getAllByRole('link');
}

// @FollowsBlueprint test-component-render
describe('the index of the day', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the nine tiles in their fixed order, each a door with its counter', () => {
    const tiles = renderIndex(COUNTS);
    expect(tiles.map((tile) => [tile.textContent, tile.getAttribute('href')])).toStrictEqual([
      ['3À décider', '/proposals'],
      ['2En retard', '/todos'],
      ['4Je dois', '/commitments?direction=owed'],
      ['1On me doit', '/commitments?direction=awaited'],
      ['5Brouillons', '/drafts'],
      ['6Relations', '/relations'],
      ['7Récurrentes', '/recurring'],
      ['Lancements', '/message#runs'],
      ['Historique', '/history'],
    ]);
  });

  it('keeps every tile in place at zero, its count muted', () => {
    const tiles = renderIndex(NO_COUNTS);
    expect(tiles.map((tile) => tile.textContent)).toStrictEqual([
      '0À décider',
      '0En retard',
      '0Je dois',
      '0On me doit',
      '0Brouillons',
      '0Relations',
      '0Récurrentes',
      'Lancements',
      'Historique',
    ]);
    expect(
      screen.getAllByText('0').every((count) => count.className.includes('text-ink-faint')),
    ).toBe(true);
    expect(tiles.some((tile) => tile.className.includes(ALERT_CLASS))).toBe(false);
  });

  it('shows no count on the recurring tile until its count is known, the tile kept in place', () => {
    const tiles = renderIndex({ ...COUNTS, dueRecurringTaskCount: undefined });
    expect(tiles.map((tile) => tile.textContent).slice(5, 8)).toStrictEqual([
      '6Relations',
      'Récurrentes',
      'Lancements',
    ]);
    expect(tiles[6]?.className).not.toContain(ALERT_CLASS);
  });

  it('raises the alert only on the overdue and the recurring tiles when they are not zero', () => {
    const tiles = renderIndex(COUNTS);
    expect(
      tiles.filter((tile) => tile.className.includes(ALERT_CLASS)).map((tile) => tile.textContent),
    ).toStrictEqual(['2En retard', '7Récurrentes']);
    expect(screen.getByText('3').className).not.toContain('text-ink-faint');
  });
});
