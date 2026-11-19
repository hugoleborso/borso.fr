import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { SessionPills } from '../../routes/sessions/session-page.core';
import { SessionPrimaryActions } from './SessionPrimaryActions';

const PRACTICE_DAY_PILLS: SessionPills = {
  practicePath: '/sessions/s/practice',
  setlistPath: null,
  setlistVariant: 'primary',
  setlistLabelKey: 'home.openSetlist',
  isAddSetlistShown: false,
  chooseSongsVariant: 'secondary',
  isOrderSongsShown: true,
};

function renderActions(pills: SessionPills): void {
  render(
    <MemoryRouter>
      <SessionPrimaryActions
        pills={pills}
        isAddingSetlist={false}
        onAddSetlist={vi.fn()}
        onChooseSongs={vi.fn()}
        orderSongs={{ order: vi.fn(), isPending: false }}
      />
    </MemoryRouter>,
  );
}

// @FollowsBlueprint test-component-render
describe('SessionPrimaryActions', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the word on the primary action of a crowded row and draws the others as named icons', () => {
    renderActions(PRACTICE_DAY_PILLS);
    expect(screen.getByRole('link', { name: 'Start the practice' }).textContent).toBe(
      'Start the practice',
    );
    for (const name of ['Order songs', 'Choose songs']) {
      const action = screen.getByRole('button', { name });
      expect(action.textContent).toBe('');
      expect(action.getAttribute('title')).toBe(name);
    }
  });

  it('keeps the word on a secondary action in a row of two', () => {
    renderActions({ ...PRACTICE_DAY_PILLS, isOrderSongsShown: false });
    expect(screen.getByRole('button', { name: 'Choose songs' }).textContent).toBe('Choose songs');
  });
});
