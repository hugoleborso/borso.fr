import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SongLineupChips } from './SongLineupChips';

const ROWS = [
  {
    memberId: 'lea',
    memberName: 'Léa',
    memberColor: '#e07a5f',
    instruments: [
      { instrumentId: 'voice', instrumentName: 'Lead vocals', icon: 'mic-vocal' },
      { instrumentId: 'guitar', instrumentName: 'Guitar', icon: 'guitar' },
    ],
  },
  { memberId: 'tom', memberName: 'Tom', memberColor: '#3d8b8b', instruments: [] },
] as const;

// @FollowsBlueprint test-component-render
describe('SongLineupChips', () => {
  afterEach(() => {
    cleanup();
  });

  it('draws one chip per member, with the icon of each instrument they hold and no mastery', () => {
    render(<SongLineupChips rows={ROWS} onEdit={vi.fn()} />);
    const chips = screen.getAllByRole('listitem');
    expect(chips.map((chip) => chip.textContent)).toEqual(['LLéa', 'TTom']);
    const leaChip = chips[0];
    if (leaChip === undefined) throw new Error('no chip for Léa');
    expect(
      within(leaChip)
        .getAllByRole('img')
        .map((mark) => mark.getAttribute('aria-label')),
    ).toEqual(['L', 'Lead vocals', 'Guitar']);
  });

  it('opens the lineup editor from its edit button', () => {
    const onEdit = vi.fn();
    render(<SongLineupChips rows={ROWS} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('says the song has no lineup yet when nobody plays it', () => {
    render(<SongLineupChips rows={[]} onEdit={vi.fn()} />);
    expect(screen.getByText('No lineup yet')).toBeTruthy();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});
