import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { MemberPartGlyph } from '../molecules/MemberPartGlyphs';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { SetlistEntryRow, type SetlistEntryRowProps } from './SetlistEntryRow';

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

function buildProps(overrides: Partial<SetlistEntryRowProps> = {}): SetlistEntryRowProps {
  return {
    position: 2,
    entryId: 'entry-1',
    title: 'Superstition',
    artist: 'Stevie Wonder',
    deezerAlbumId: null,
    keyLabel: null,
    capo: null,
    notes: '',
    lineupColumn: {
      slots: [{ slotKey: 'drums', instrumentName: 'Drums', glyph: 'drum', holderColor: '#000' }],
    },
    lineupChanges: [],
    memberPart: [],
    isMemberView: false,
    transitionBefore: null,
    onOpen: () => undefined,
    onRemove: () => undefined,
    ...overrides,
  };
}

function renderRow(props: SetlistEntryRowProps): void {
  render(
    <DndContext>
      <SortableContext items={[props.entryId]}>
        <ul>
          <SetlistEntryRow {...props} />
        </ul>
      </SortableContext>
    </DndContext>,
  );
}

// @FollowsBlueprint test-component-render
describe('a setlist row', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StillResizeObserver);
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows its position, its song, the key and capo, and the band lineup', () => {
    renderRow(buildProps({ keyLabel: 'Am', capo: 2 }));
    expect(screen.getByText('02')).toBeTruthy();
    expect(screen.getByText('· Am · capo 2')).toBeTruthy();
    expect(screen.queryAllByTitle('Drums').length).toBeGreaterThan(0);
  });

  it('shows the note written for tonight and tonight’s lineup change', () => {
    renderRow(
      buildProps({
        notes: 'Finir sur le refrain',
        lineupChanges: [
          { memberId: 'tom', firstName: 'Tom', heldInstrumentNames: ['Guitar'] },
          { memberId: 'lea', firstName: 'Léa', heldInstrumentNames: [] },
        ],
      }),
    );
    expect(screen.getByText('Finir sur le refrain')).toBeTruthy();
    expect(screen.getByText('Tonight: Tom: Guitar · Léa sits out')).toBeTruthy();
  });

  it('opens the entry when the row is tapped', () => {
    const onOpen = vi.fn();
    renderRow(buildProps({ onOpen }));
    fireEvent.click(screen.getByRole('button', { name: /Superstition/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('removes the entry from its more menu once confirmed', () => {
    const onRemove = vi.fn();
    renderRow(buildProps({ onRemove }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from the setlist' }));
    const confirm = screen.getByRole('dialog');
    fireEvent.click(
      Array.from(confirm.querySelectorAll('button')).find(
        (button) => button.textContent === 'Remove from the setlist',
      ) ?? confirm,
    );
    expect(onRemove).toHaveBeenCalledExactlyOnceWith('entry-1');
  });

  it('shows the instruments of the chosen member in place of the band lineup', () => {
    renderRow(buildProps({ isMemberView: true, memberPart: [BASS_PART, LEAD_VOCALS_PART] }));
    expect(screen.getByRole('img', { name: 'Bass' })).toBeTruthy();
    expect(screen.getByText('Lead vocals')).toBeTruthy();
    expect(screen.queryAllByTitle('Drums')).toHaveLength(0);
  });
});
