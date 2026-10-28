import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { LineupGrid } from './lineup-grid.core';
import { SetlistLineupGrid } from './SetlistLineupGrid';

const CORAL = '#e07a5f';
const TEAL = '#3d8b8b';

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
      cells: [
        {
          memberId: 'anna',
          firstName: 'Anna',
          color: CORAL,
          glyphs: [{ instrumentId: 'guitar', name: 'Guitar', glyph: 'guitar' }],
          isPlaying: true,
          isChanged: false,
        },
        {
          memberId: 'bruno',
          firstName: 'Bruno',
          color: TEAL,
          glyphs: [],
          isPlaying: false,
          isChanged: false,
        },
      ],
    },
    {
      entryId: 'entry-2',
      position: 2,
      title: 'Respect',
      cells: [
        {
          memberId: 'anna',
          firstName: 'Anna',
          color: CORAL,
          glyphs: [{ instrumentId: 'voice', name: 'Voice', glyph: 'micVocal' }],
          isPlaying: true,
          isChanged: true,
        },
        {
          memberId: 'bruno',
          firstName: 'Bruno',
          color: TEAL,
          glyphs: [{ instrumentId: 'bass', name: 'Bass', glyph: 'bass' }],
          isPlaying: true,
          isChanged: true,
        },
      ],
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

// @FollowsBlueprint test-component-render
describe('the Lineup grid', () => {
  afterEach(() => {
    cleanup();
  });

  it('fills a played cell with its member’s stored colour and names who plays what', () => {
    const { container } = renderGrid();
    const cell = screen.getByRole('button', { name: 'Valerie: Anna plays Guitar.' });
    expect(cell.querySelector('span')?.style.backgroundColor).toBe('rgb(224, 122, 95)');
    expect(container.querySelector('[data-lineup-lane="bruno"]')).not.toBeNull();
  });

  it('draws a sit-out cell as a dot of the member colour', () => {
    renderGrid();
    const cell = screen.getByRole('button', { name: 'Valerie: Bruno sits out.' });
    expect(cell.querySelector('span')?.style.backgroundColor).toBe('rgb(61, 139, 139)');
  });

  it('marks a cell that changed from the song before, without changing its fill', () => {
    renderGrid();
    const cell = screen.getByRole('button', {
      name: 'Respect: Bruno plays Bass. Changed from the song before.',
    });
    expect(cell.getAttribute('data-lineup-changed')).toBe('true');
    expect(cell.querySelector('span')?.style.backgroundColor).toBe('rgb(61, 139, 139)');
  });

  it('opens the entry when a cell is tapped, and a member’s part from the column head', () => {
    const { onOpenCell, onOpenMember } = renderGrid();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Respect: Anna plays Voice. Changed from the song before.',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show the part of Bruno' }));
    expect(onOpenCell).toHaveBeenCalledExactlyOnceWith('entry-2');
    expect(onOpenMember).toHaveBeenCalledExactlyOnceWith('bruno');
  });

  it('writes the member’s first name in ink under the column head', () => {
    renderGrid();
    expect(screen.getByText('Anna').className).toContain('text-ink');
  });
});
