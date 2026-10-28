import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { type OrderRow, SetlistOrderList } from './SetlistOrderList';

const ROWS: readonly OrderRow[] = [
  { id: 'a', title: 'Dreams', durationSeconds: 257, entryEnergy: 4, songEnergy: null },
  { id: 'b', title: 'Jolene', durationSeconds: 161, entryEnergy: null, songEnergy: 9 },
  { id: 'c', title: 'Hey Ya!', durationSeconds: null, entryEnergy: null, songEnergy: null },
];

function renderList(): void {
  render(<SetlistOrderList rows={ROWS} onReorder={() => undefined} />);
}

// @FollowsBlueprint test-component-render
describe('the Order list', () => {
  afterEach(() => {
    cleanup();
  });

  it('draws one bar per song, with the average energy and the total time', () => {
    renderList();
    expect(document.querySelectorAll('[data-energy-curve] > span')).toHaveLength(ROWS.length);
    expect(screen.getByText('Average energy 6 · 7 min')).toBeTruthy();
  });

  it('hides the curve behind the Energy curve chip and shows it again', () => {
    renderList();
    const chip = screen.getByRole('button', { name: 'Energy curve' });
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(document.querySelector('[data-energy-curve]')).toBeNull();
    fireEvent.click(chip);
    expect(document.querySelector('[data-energy-curve]')).not.toBeNull();
  });

  it('gives every row a drag handle, its number, its five-step energy and its length', () => {
    renderList();
    expect(screen.getAllByRole('button', { name: 'Drag to reorder' })).toHaveLength(ROWS.length);
    expect(screen.getByRole('img', { name: 'Energy 5 of 5' })).toBeTruthy();
    expect(screen.getByText('4:17')).toBeTruthy();
    expect(screen.getByText('03')).toBeTruthy();
  });
});
