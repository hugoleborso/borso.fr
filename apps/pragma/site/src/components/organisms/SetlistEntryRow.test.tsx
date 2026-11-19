import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { MemberPartGlyph } from '../molecules/MemberPartGlyphs';
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
const GUITAR_PART: MemberPartGlyph = {
  instrumentId: 'guitar',
  name: 'Guitar',
  icon: 'guitar',
  isNameNeeded: false,
};
const TOM_COLOR = '#3d8b8b';
const TOM_RENDERED = 'rgb(61, 139, 139)';
const LEA_COLOR = '#e07a5f';
const LEA_RENDERED = 'rgb(224, 122, 95)';
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
      isUnassigned: false,
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

  it('says the song has no lineup yet instead of leaving its lineup empty', () => {
    renderRow(buildProps({ lineupColumn: { slots: [], isUnassigned: true } }));
    expect(screen.getByText('No lineup yet')).toBeTruthy();
  });

  it('marks a song with no lineup yet with the warning icon', () => {
    renderRow(buildProps({ lineupColumn: { slots: [], isUnassigned: true } }));
    const notice = screen.getByText('No lineup yet');
    expect(notice.querySelector('svg')).not.toBeNull();
    expect(notice.className).toContain('text-warn');
  });

  it('shows the note written for tonight, and tonight’s lineup change read aloud as its sentence', () => {
    renderRow(
      buildProps({
        notes: 'Finir sur le refrain',
        lineupChanges: [
          { memberId: 'tom', firstName: 'Tom', color: TOM_COLOR, heldParts: [GUITAR_PART] },
          { memberId: 'lea', firstName: 'Léa', color: LEA_COLOR, heldParts: [] },
        ],
      }),
    );
    expect(screen.getByText('Finir sur le refrain')).toBeTruthy();
    const change = screen.getByRole('img', { name: 'Tonight: Tom: Guitar · Léa sits out' });
    expect(change.textContent).toBe('');
    expect(screen.queryByText(/Tonight/)).toBeNull();
  });

  it('draws a member’s change as their dot then the glyphs they play tonight', () => {
    renderRow(
      buildProps({
        lineupChanges: [
          { memberId: 'tom', firstName: 'Tom', color: TOM_COLOR, heldParts: [GUITAR_PART] },
        ],
      }),
    );
    const tom = document.querySelector('[data-lineup-change="tom"]');
    const mark = tom?.firstElementChild;
    expect(mark instanceof HTMLElement ? mark.style.backgroundColor : null).toBe(TOM_RENDERED);
    expect(mark?.className).toContain('size-2.5');
    expect(tom?.querySelector('[aria-label="Guitar"] svg')).not.toBeNull();
  });

  it('draws a member who sits out as their ring, with no glyph', () => {
    renderRow(
      buildProps({
        lineupChanges: [{ memberId: 'lea', firstName: 'Léa', color: LEA_COLOR, heldParts: [] }],
      }),
    );
    const lea = document.querySelector('[data-lineup-change="lea"]');
    const mark = lea?.firstElementChild;
    expect(mark instanceof HTMLElement ? mark.style.borderColor : null).toBe(LEA_RENDERED);
    expect(mark?.className).toContain('border-2');
    expect(lea?.querySelector('svg')).toBeNull();
  });

  it('opens the entry when the row is tapped', () => {
    const onOpen = vi.fn();
    renderRow(buildProps({ onOpen }));
    const rowButton = screen
      .getAllByRole('button', { name: /Superstition/ })
      .find((button) => !button.hasAttribute('popovertarget'));
    if (rowButton === undefined) throw new Error('the row renders no button of its own');
    fireEvent.click(rowButton);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('removes the entry from its more menu with no confirmation sheet', () => {
    const onRemove = vi.fn();
    renderRow(buildProps({ onRemove }));
    fireEvent.click(screen.getByRole('button', { name: 'More for Superstition' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from the setlist' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith('entry-1');
    expect(screen.queryByRole('menu')).toBe(null);
  });

  it('offers to add a break after the song only when the list can take one', () => {
    const onAddBreakAfter = vi.fn();
    renderRow(buildProps({ onAddBreakAfter }));
    fireEvent.click(screen.getByRole('button', { name: 'More for Superstition' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add a break after' }));
    expect(onAddBreakAfter).toHaveBeenCalledExactlyOnceWith('entry-1');
    cleanup();
    renderRow(buildProps());
    fireEvent.click(screen.getByRole('button', { name: 'More for Superstition' }));
    expect(screen.queryByRole('menuitem', { name: 'Add a break after' })).toBeNull();
  });

  it('shows the instruments of the chosen member in place of the band lineup', () => {
    renderRow(buildProps({ isMemberView: true, memberPart: [BASS_PART, LEAD_VOCALS_PART] }));
    expect(screen.getByRole('img', { name: 'Bass' })).toBeTruthy();
    expect(screen.getByText('Lead vocals')).toBeTruthy();
    expect(screen.queryAllByTitle('Drums')).toHaveLength(0);
  });
});
