import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import { openScreen, useAppScreen } from '@/navigation/navigation.store';
import { TopBar } from './TopBar';

// @FollowsBlueprint test-hook-probe
function AppScreenProbe() {
  const screen = useAppScreen();
  return <output data-testid="screen">{screen.kind}</output>;
}

// @FollowsBlueprint test-component-render
describe('TopBar', () => {
  it('lets the user change the board style', async () => {
    render(<TopBar />);
    const select = screen.getByRole('combobox', { name: 'Board style:' });
    await userEvent.selectOptions(select, 'nord');
    expect(select).toHaveProperty('value', 'nord');
  });

  it('opens Credits', async () => {
    openScreen({ kind: 'today' });
    render(
      <>
        <TopBar />
        <AppScreenProbe />
      </>,
    );
    expect(screen.getByTestId('screen').textContent).toBe('today');
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }));
    expect(screen.getByTestId('screen').textContent).toBe('credits');
  });

  it('no longer carries the mode toggle, which lives in Explore', () => {
    render(<TopBar />);
    expect(screen.queryByRole('button', { name: 'Toggle mode' })).toBeNull();
  });
});
