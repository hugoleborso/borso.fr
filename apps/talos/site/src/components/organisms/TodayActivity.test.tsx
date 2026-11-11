import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { TodayActivity } from './TodayActivity';

const ENTRIES = [
  { date: '2026-11-11', heading: 'Scan (07:00)' },
  { date: '2026-11-10', heading: 'Collecte Mac (21:00)' },
];

// @FollowsBlueprint test-component-render
describe('TodayActivity', () => {
  afterEach(() => {
    cleanup();
  });

  it('folds the activity under its counter and unfolds it on a tap', async () => {
    const { container } = render(
      <MemoryRouter>
        <TodayActivity entries={ENTRIES} today="2026-11-11" />
      </MemoryRouter>,
    );
    const details = container.querySelector('details');
    expect(details?.open).toBe(false);
    await userEvent.click(screen.getByText('Activité · 2'));
    expect(details?.open).toBe(true);
    expect(
      [...container.querySelectorAll('li a')].map((link) => link.getAttribute('href')),
    ).toStrictEqual(['/brain/page/journal/2026-11-11', '/brain/page/journal/2026-11-10']);
  });

  it('shows nothing when Talos did nothing', () => {
    const { container } = render(
      <MemoryRouter>
        <TodayActivity entries={[]} today="2026-11-11" />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });
});
