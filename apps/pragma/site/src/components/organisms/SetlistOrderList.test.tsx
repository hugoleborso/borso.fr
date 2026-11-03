import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { type OrderRow, SetlistOrderList } from './SetlistOrderList';

const ROWS: readonly OrderRow[] = [
  {
    id: 'a',
    kind: 'song',
    title: 'Dreams',
    durationSeconds: 257,
    entryEnergy: 4,
    songEnergy: null,
  },
  {
    id: 'b',
    kind: 'song',
    title: 'Jolene',
    durationSeconds: 161,
    entryEnergy: null,
    songEnergy: 9,
  },
  {
    id: 'c',
    kind: 'song',
    title: 'Hey Ya!',
    durationSeconds: null,
    entryEnergy: null,
    songEnergy: null,
  },
];

function renderList(
  onEnergyChange: (rowId: string, level: number) => void = () => undefined,
): void {
  render(
    <SetlistOrderList rows={ROWS} onReorder={() => undefined} onEnergyChange={onEnergyChange} />,
  );
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

  it('gives every row a drag handle, its number, its energy and its length', () => {
    renderList();
    expect(screen.getAllByRole('button', { name: 'Drag to reorder' })).toHaveLength(ROWS.length);
    expect(
      screen
        .getAllByRole('slider', { name: 'Energy' })
        .map((meter) => meter.getAttribute('aria-valuenow')),
    ).toEqual(['4', '9', '5']);
    expect(screen.getByText('4:17')).toBeTruthy();
    expect(screen.getByText('03')).toBeTruthy();
  });

  it('changes the energy of a song from its row', () => {
    const onEnergyChange = vi.fn();
    renderList(onEnergyChange);
    const [firstMeter] = screen.getAllByRole('slider', { name: 'Energy' });
    fireEvent.keyDown(firstMeter ?? document.body, { key: 'ArrowRight' });
    expect(onEnergyChange).toHaveBeenCalledExactlyOnceWith('a', 5);
  });

  it('shows a break as a draggable row with no number, kept out of the curve and the total', () => {
    const withBreak: readonly OrderRow[] = [
      ...ROWS.slice(0, 1),
      {
        id: 'p',
        kind: 'break',
        title: 'Intermission',
        durationSeconds: null,
        entryEnergy: null,
        songEnergy: null,
      },
      ...ROWS.slice(1),
    ];
    render(
      <SetlistOrderList
        rows={withBreak}
        onReorder={() => undefined}
        onEnergyChange={() => undefined}
      />,
    );
    expect(screen.getByText('Intermission')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Drag to reorder' })).toHaveLength(4);
    expect(document.querySelectorAll('[data-energy-curve] > span')).toHaveLength(ROWS.length);
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.queryByText('04')).toBeNull();
  });
});
