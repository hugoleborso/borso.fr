import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { SetlistEntriesList, type SetlistEntriesListProps } from './SetlistEntriesList';
import type { TransitionView } from './transition-view.core';

class StillResizeObserver implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

const ENTRIES = ['a', 'b', 'c'].map((id) => ({
  id,
  songId: `song-${id}`,
  lineupOverride: null,
  keyOverride: null,
  capo: null,
  notes: '',
}));
const SONGS_BY_ID = Object.fromEntries(
  ENTRIES.map((entry) => [
    entry.songId,
    { id: entry.songId, title: entry.id, artist: '', defaultLineup: {} },
  ]),
);
const HELD: TransitionView = { kind: 'covered', carriers: [] };
const INTERMISSION = { id: 'p1', label: 'Intermission', position: 1, songsBefore: 1 };

function buildProps(overrides: Partial<SetlistEntriesListProps> = {}): SetlistEntriesListProps {
  return {
    entries: ENTRIES,
    visibleEntries: ENTRIES,
    songsById: SONGS_BY_ID,
    transitionViews: [HELD, HELD],
    transitionNotesByPair: {},
    inFilteredMode: false,
    memberPartByEntryId: {},
    lineupMembers: [],
    slotInstruments: [],
    knownMemberIds: new Set(),
    lineupChangesByEntryId: {},
    onOpen: () => undefined,
    onRemove: () => undefined,
    onOpenTransition: () => undefined,
    breaks: [INTERMISSION],
    onAddBreakAfter: () => undefined,
    onRenameBreak: () => undefined,
    onRemoveBreak: () => undefined,
    ...overrides,
  };
}

function countTransitionStrips(): number {
  return document.querySelectorAll('[data-transition-line]').length;
}

// @FollowsBlueprint test-component-render
describe('the setlist entries list', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a break between the songs it separates and offers no transition across it', () => {
    render(<SetlistEntriesList {...buildProps({ breaks: [] })} />);
    const stripsWithoutBreak = countTransitionStrips();
    cleanup();

    render(<SetlistEntriesList {...buildProps()} />);

    const rows = [...(document.querySelector('ul')?.children ?? [])];
    const breakIndex = rows.findIndex((row) => row.hasAttribute('data-setlist-break'));
    expect(breakIndex).toBe(1);
    expect(stripsWithoutBreak).toBe(2);
    expect(countTransitionStrips()).toBe(1);
  });

  it('shows no break and offers none in the My part view', () => {
    render(<SetlistEntriesList {...buildProps({ inFilteredMode: true })} />);

    expect(document.querySelector('[data-setlist-break]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add a break after', hidden: true })).toBeNull();
  });
});
