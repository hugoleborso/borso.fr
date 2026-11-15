import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { LineupGrid, LineupGridCell } from './lineup-grid.core';
import { SetlistLineupGrid } from './SetlistLineupGrid';

const CORAL = '#e07a5f';
const TEAL = '#3d8b8b';
const CORAL_RGB = 'rgb(224, 122, 95)';
const TEAL_RGB = 'rgb(61, 139, 139)';
const GUITAR = { instrumentId: 'guitar', name: 'Guitar', glyph: 'guitar' } as const;
const BASS = { instrumentId: 'bass', name: 'Bass', glyph: 'bass' } as const;

const SITS_OUT = {
  glyphs: [],
  previousGlyphs: [],
  isPlaying: false,
  isChanged: false,
  joinsPrevious: false,
  joinsNext: false,
} as const;

function annaCell(overrides: Partial<LineupGridCell>): LineupGridCell {
  return { memberId: 'anna', firstName: 'Anna', color: CORAL, ...SITS_OUT, ...overrides };
}

function brunoCell(overrides: Partial<LineupGridCell>): LineupGridCell {
  return { memberId: 'bruno', firstName: 'Bruno', color: TEAL, ...SITS_OUT, ...overrides };
}

const GRID: LineupGrid = {
  columns: [
    { memberId: 'anna', firstName: 'Anna', color: CORAL },
    { memberId: 'bruno', firstName: 'Bruno', color: TEAL },
  ],
  rows: [
    {
      entryId: 'entry-1',
      position: 1,
      title: 'Valerie',
      changeCount: 0,
      isCompact: false,
      cells: [annaCell({ glyphs: [GUITAR], isPlaying: true, joinsNext: true }), brunoCell({})],
    },
    {
      entryId: 'entry-2',
      position: 2,
      title: 'Respect',
      changeCount: 1,
      isCompact: false,
      cells: [
        annaCell({ glyphs: [GUITAR], isPlaying: true, joinsPrevious: true }),
        brunoCell({ glyphs: [BASS], isPlaying: true, isChanged: true, joinsNext: true }),
      ],
    },
    {
      entryId: 'entry-3',
      position: 3,
      title: 'Crazy',
      changeCount: 1,
      isCompact: false,
      cells: [
        annaCell({
          glyphs: [BASS],
          previousGlyphs: [GUITAR],
          isPlaying: true,
          isChanged: true,
        }),
        brunoCell({ glyphs: [BASS], isPlaying: true, joinsPrevious: true }),
      ],
    },
    {
      entryId: 'entry-4',
      position: 4,
      title: 'Hey Ya',
      changeCount: 0,
      isCompact: true,
      cells: [annaCell({}), brunoCell({})],
    },
  ],
};

function renderGrid() {
  const onOpenCell = vi.fn();
  const onOpenMember = vi.fn();
  const view = render(
    <SetlistLineupGrid grid={GRID} onOpenCell={onOpenCell} onOpenMember={onOpenMember} />,
  );
  return { ...view, onOpenCell, onOpenMember };
}

function rowOf(container: HTMLElement, entryId: string): Element | null {
  return container.querySelector(`[data-lineup-row="${entryId}"]`);
}

// @FollowsBlueprint test-component-render
describe('the Lineup grid', () => {
  afterEach(() => {
    cleanup();
  });

  it('fills the cell that starts a run with its member’s stored colour and names who plays what', () => {
    renderGrid();
    const cell = screen.getByRole('button', { name: 'Valerie: Anna plays Guitar.' });
    expect(cell.querySelector('span')?.style.backgroundColor).toBe(CORAL_RGB);
    expect(cell.getAttribute('data-lineup-joins-previous')).toBe('false');
  });

  it('leaves a sit-out cell empty and still names it', () => {
    renderGrid();
    const cell = screen.getByRole('button', { name: 'Valerie: Bruno sits out.' });
    expect(cell.querySelector('span')).toBeNull();
  });

  it('tints a cell that joins the run above, pulled up over the row gap, with faint glyphs', () => {
    renderGrid();
    const cell = screen.getByRole('button', { name: 'Respect: Anna plays Guitar.' });
    const mark = cell.querySelector('span');
    expect(cell.getAttribute('data-lineup-joins-previous')).toBe('true');
    expect(cell.className).toContain('-mt-1');
    expect(mark?.style.backgroundColor).toBe('color-mix(in srgb, #e07a5f 18%, var(--color-paper))');
    expect(mark?.className).toContain('text-ink');
    expect(mark?.querySelector('span')?.className).toContain('opacity-40');
  });

  it('fills a changed cell in full with only its new glyphs, and names what came before in its label', () => {
    renderGrid();
    const cell = screen.getByRole('button', {
      name: 'Crazy: Anna plays Bass. Was Guitar on the song before.',
    });
    const mark = cell.querySelector('span');
    expect(cell.getAttribute('data-lineup-changed')).toBe('true');
    expect(mark?.style.backgroundColor).toBe(CORAL_RGB);
    expect(mark?.querySelectorAll(':scope > span')).toHaveLength(1);
    expect(mark?.querySelectorAll('svg')).toHaveLength(1);
  });

  it('falls back to a plain change sentence when the member sat out the song before', () => {
    renderGrid();
    const cell = screen.getByRole('button', {
      name: 'Respect: Bruno plays Bass. Changed from the song before.',
    });
    expect(cell.querySelector('span')?.style.backgroundColor).toBe(TEAL_RGB);
    expect(cell.querySelectorAll('span > span')).toHaveLength(1);
  });

  it('badges a row with its change count and keeps a row with none compact and bare', () => {
    const { container } = renderGrid();
    const badge = rowOf(container, 'entry-2')?.querySelector('[data-lineup-change-badge]');
    expect(badge?.textContent).toBe('11 change from the song before');
    expect(rowOf(container, 'entry-1')?.querySelector('[data-lineup-change-badge]')).toBeNull();
    const compact = rowOf(container, 'entry-4');
    expect(compact?.querySelector('[data-lineup-change-badge]')).toBeNull();
    expect(compact?.querySelector('[data-lineup-cell]')?.className).toContain('min-h-7');
    expect(rowOf(container, 'entry-1')?.querySelector('[data-lineup-cell]')?.className).toContain(
      'min-h-11',
    );
  });

  it('opens the entry when a cell is tapped, and a member’s part from the column head', () => {
    const { onOpenCell, onOpenMember } = renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Hey Ya: Anna sits out.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show the part of Bruno' }));
    expect(onOpenCell).toHaveBeenCalledExactlyOnceWith('entry-4');
    expect(onOpenMember).toHaveBeenCalledExactlyOnceWith('bruno');
  });

  it('writes the member’s first name in ink under the column head', () => {
    renderGrid();
    expect(screen.getByText('Anna').className).toContain('text-ink');
  });
});
