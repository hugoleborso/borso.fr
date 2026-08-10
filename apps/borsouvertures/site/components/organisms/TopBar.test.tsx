import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import { ALL_KEY } from '@/openings/selectors.utils';
import { setMode, setPlayScope, setSelection, useAppState } from '@/state/appState';
import { TopBar } from './TopBar';

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

beforeEach(() => {
  setMode('learn');
  setSelection({ openingId: 'italian', variationId: 'classical', lineId: ALL_KEY });
  setPlayScope({ openingIds: ['italian'], variationIds: [], lineIds: [] });
});

// @FollowsBlueprint test-component-render
describe('TopBar', () => {
  it('drops the drilled selection and the scope when the user switches to play', async () => {
    render(
      <>
        <TopBar />
        <AppStateProbe />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle mode' }));
    expect(screen.getByTestId('mode').textContent).toBe('play');
    expect(screen.getByTestId('opening').textContent).toBe(ALL_KEY);
    expect(screen.getByTestId('scope').textContent).toBe('');
  });

  it('keeps the scope when the user switches back to learn', async () => {
    setMode('play');
    render(
      <>
        <TopBar />
        <AppStateProbe />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle mode' }));
    expect(screen.getByTestId('mode').textContent).toBe('learn');
    expect(screen.getByTestId('scope').textContent).toBe('italian');
  });

  it('lets the user change the board style', async () => {
    render(<TopBar />);
    const select = screen.getByRole('combobox', { name: 'Board style:' });
    await userEvent.selectOptions(select, 'nord');
    expect(select).toHaveProperty('value', 'nord');
  });
});
