import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import { ALL_KEY } from '@/openings/selectors.utils';
import { setMode, setPlayScope, setSelection, useAppState } from '@/state/appState';
import { ExploreScreen } from './ExploreScreen';

// @FollowsBlueprint test-hook-probe
function AppStateProbe() {
  const { mode, selection, playScope } = useAppState();
  return (
    <dl>
      <dd data-testid="mode">{mode}</dd>
      <dd data-testid="opening">{selection.openingId}</dd>
      <dd data-testid="scope">{playScope.openingIds.join(',')}</dd>
    </dl>
  );
}

async function renderExplore(): Promise<void> {
  await act(async () => {
    render(
      <>
        <ExploreScreen />
        <AppStateProbe />
      </>,
    );
    await Promise.resolve();
  });
}

beforeEach(() => {
  setMode('learn');
  setSelection({ openingId: 'italian', variationId: 'classical', lineId: ALL_KEY });
  setPlayScope({ openingIds: ['italian'], variationIds: [], lineIds: [] });
});

// @FollowsBlueprint test-component-render
describe('ExploreScreen', () => {
  it('says that nothing done here creates a review', async () => {
    await renderExplore();
    expect(
      screen.getByText(
        'Learn and play over the whole catalogue of openings. Nothing you do here creates a review.',
      ),
    ).toBeTruthy();
  });

  it('drops the drilled selection and the scope when the user switches to play', async () => {
    await renderExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Toggle mode' }));
    expect(screen.getByTestId('mode').textContent).toBe('play');
    expect(screen.getByTestId('opening').textContent).toBe(ALL_KEY);
    expect(screen.getByTestId('scope').textContent).toBe('');
  });

  it('keeps the scope when the user switches back to learn', async () => {
    setMode('play');
    await renderExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Toggle mode' }));
    expect(screen.getByTestId('mode').textContent).toBe('learn');
    expect(screen.getByTestId('scope').textContent).toBe('italian');
  });
});
