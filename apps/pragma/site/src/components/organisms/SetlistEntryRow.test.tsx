import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SetlistEntryRow, type SetlistEntryRowProps } from './SetlistEntryRow';

const NO_LINEUP = {};

class StillResizeObserver implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

function buildProps(memberPart: readonly string[]): SetlistEntryRowProps {
  return {
    position: 1,
    entryId: 'entry-1',
    songId: 'song-1',
    title: 'Superstition',
    deezerAlbumId: null,
    deezerTrackId: null,
    spotifyTrackId: null,
    artist: 'Stevie Wonder',
    tonalityLabel: null,
    meanMastery: null,
    keyOverride: null,
    capo: null,
    energy: null,
    baseEnergy: null,
    notes: '',
    lineupColumn: { slots: [] },
    resolvedLineupForEdit: NO_LINEUP,
    songDefaultLineup: NO_LINEUP,
    songDefaults: { status: 'ready', tonalityStart: null, tonalityEnd: null, baseEnergy: null },
    lineupOverride: null,
    members: [],
    instruments: [],
    memberPart,
    transitionBefore: null,
    onUpdate: () => undefined,
    onUpdateSongDefaults: () => undefined,
    onRemove: () => undefined,
  };
}

// @FollowsBlueprint test-component-render
describe('a setlist row filtered to one member', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('names what that member plays on the song', () => {
    render(<SetlistEntryRow {...buildProps(['Bass', 'Backing vocals'])} />);
    expect(screen.getByText('Bass + Backing vocals')).toBeTruthy();
  });

  it('names nothing when no member is chosen', () => {
    render(<SetlistEntryRow {...buildProps([])} />);
    expect(screen.queryByText(/\+/)).toBeNull();
  });
});
