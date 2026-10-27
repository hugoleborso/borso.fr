import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { MemberPartGlyph } from '../molecules/MemberPartGlyphs';
import { SetlistEntryRow, type SetlistEntryRowProps } from './SetlistEntryRow';
import { stubSheetDialog } from '../molecules/sheet.test-utils';

const NO_LINEUP = {};

class StillResizeObserver implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

const BASS_PART: MemberPartGlyph = {
  instrumentId: 'bass',
  name: 'Bass',
  icon: 'bass',
  isNameNeeded: false,
};
const LEAD_VOCALS_PART: MemberPartGlyph = {
  instrumentId: 'lead-vocals',
  name: 'Lead vocals',
  icon: 'mic-vocal',
  isNameNeeded: true,
};

function buildProps(memberPart: readonly MemberPartGlyph[]): SetlistEntryRowProps {
  return {
    position: 1,
    entryId: 'entry-1',
    title: 'Superstition',
    deezerAlbumId: null,
    deezerTrackId: '3135556',
    spotifyTrackId: null,
    artist: 'Stevie Wonder',
    tonalityLabel: null,
    meanMastery: null,
    keyOverride: null,
    capo: null,
    energy: null,
    baseEnergy: null,
    notes: '',
    lineupColumn: {
      slots: [{ slotKey: 'drums', instrumentName: 'Drums', glyph: 'instr', holderColor: '#000' }],
    },
    resolvedLineupForEdit: NO_LINEUP,
    songDefaultLineup: NO_LINEUP,
    songDefaults: {
      status: 'concert_ready',
      tonalityStart: null,
      tonalityEnd: null,
      baseEnergy: null,
    },
    lineupOverride: null,
    members: [],
    instruments: [],
    memberPart,
    isMemberView: memberPart.length > 0,
    transitionBefore: null,
    onUpdate: () => undefined,
    onSave: async () => ({}),
    onUpdateSongDefaults: () => undefined,
    onRemove: () => undefined,
  };
}

// @FollowsBlueprint test-component-render
describe('a setlist row filtered to one member', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the icon of what that member plays, named for screen readers', () => {
    render(<SetlistEntryRow {...buildProps([BASS_PART, LEAD_VOCALS_PART])} />);
    expect(screen.getByRole('img', { name: 'Bass' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Lead vocals' })).toBeTruthy();
  });

  it('writes the name only for an instrument whose icon stands for another one too', () => {
    render(<SetlistEntryRow {...buildProps([BASS_PART, LEAD_VOCALS_PART])} />);
    expect(screen.queryByText('Bass')).toBeNull();
    expect(screen.getByText('Lead vocals')).toBeTruthy();
  });

  it('names nothing when no member is chosen', () => {
    render(<SetlistEntryRow {...buildProps([])} />);
    expect(screen.queryByRole('img', { name: 'Bass' })).toBeNull();
  });

  it('leaves the band lineup out of a member view', () => {
    render(<SetlistEntryRow {...buildProps([BASS_PART])} />);
    expect(screen.queryAllByTitle('Drums')).toHaveLength(0);
  });

  it('shows the band lineup when no member is chosen', () => {
    render(<SetlistEntryRow {...buildProps([])} />);
    expect(screen.queryAllByTitle('Drums').length).toBeGreaterThan(0);
  });
});

// @FollowsBlueprint test-component-render
describe('a setlist row tapped open', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps the energy out of reach until the row is opened', () => {
    render(<SetlistEntryRow {...buildProps([])} />);
    expect(screen.queryByRole('slider', { name: 'Energy' })).toBeNull();
  });

  it('opens a sheet with the energy, the lineup and the Deezer link', () => {
    render(<SetlistEntryRow {...buildProps([])} />);
    fireEvent.click(screen.getByRole('button', { name: /Superstition/ }));
    const sheet = screen.getByRole('dialog', { name: 'Superstition' });
    expect(sheet.querySelector('[role="slider"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Deezer/ }).getAttribute('href')).toContain('3135556');
    expect(screen.getAllByRole('button', { name: 'Lineup (this set)' }).length).toBeGreaterThan(0);
  });

  it('closes the sheet from its close button', () => {
    render(<SetlistEntryRow {...buildProps([])} />);
    fireEvent.click(screen.getByRole('button', { name: /Superstition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('saves the full note when the sheet is closed before the pause ends', () => {
    const onSave = vi.fn(async () => ({}));
    render(<SetlistEntryRow {...buildProps([])} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Superstition/ }));
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    fireEvent.change(notes, { target: { value: 'F' } });
    fireEvent.change(notes, { target: { value: 'Finir sur le refrain' } });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith('entry-1', { notes: 'Finir sur le refrain' });
  });

  it('saves the key and an empty capo as cleared values', async () => {
    const onSave = vi.fn(async () => ({}));
    render(<SetlistEntryRow {...buildProps([])} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Superstition/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Key' }), { target: { value: 'Am' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capo' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onSave).toHaveBeenCalledWith('entry-1', { keyOverride: 'Am' });
    expect(onSave).toHaveBeenCalledWith('entry-1', { capo: 2 });
    fireEvent.click(screen.getByRole('button', { name: /Superstition/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Key' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capo' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('entry-1', { keyOverride: null });
    });
    expect(onSave).toHaveBeenCalledWith('entry-1', { capo: null });
  });
});
