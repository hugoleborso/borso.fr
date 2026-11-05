import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { SongDetailSidebar } from './SongDetailSidebar';

// @FollowsBlueprint test-component-render
describe('the lineup side of a song', () => {
  afterEach(() => {
    cleanup();
  });

  it('says the song has no lineup yet when nobody plays it', () => {
    render(<SongDetailSidebar lineupRows={[]} />);
    expect(screen.getByText('No lineup yet')).toBeTruthy();
  });

  it('marks the missing lineup with the warning icon, as the setlist rows do', () => {
    render(<SongDetailSidebar lineupRows={[]} />);
    const notice = screen.getByText('No lineup yet');
    expect(notice.querySelector('svg')).not.toBeNull();
    expect(notice.className).toContain('text-warn');
  });

  it('lists who plays what once the song has a lineup', () => {
    render(
      <SongDetailSidebar
        lineupRows={[
          {
            memberId: 'lea',
            memberName: 'Léa',
            memberColor: '#2f8f6b',
            instruments: [],
          },
        ]}
      />,
    );
    expect(screen.queryByText('No lineup yet')).toBeNull();
    expect(screen.getAllByText('Léa').length).toBeGreaterThan(0);
  });
});
