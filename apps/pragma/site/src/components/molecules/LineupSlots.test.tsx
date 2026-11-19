import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LineupSlots } from './LineupSlots';
import type { LineupColumnView } from './lineup-slots.core';

const ROOM_FOR_EVERY_SLOT_PX = 480;

const COLUMN: LineupColumnView = {
  isUnassigned: false,
  slots: [
    { slotKey: 'bass-lea', instrumentName: 'Bass', glyph: 'bass', holderColor: '#e07a5f' },
    { slotKey: 'drums-tom', instrumentName: 'Drums', glyph: 'drum', holderColor: '#3d8b8b' },
  ],
};

// @FollowsBlueprint test-component-render
describe('LineupSlots', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: ROOM_FOR_EVERY_SLOT_PX, height: 24 }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('names each instrument chip for a screen reader by its instrument', () => {
    render(<LineupSlots column={COLUMN} />);
    expect(screen.getAllByRole('img').map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Bass',
      'Drums',
    ]);
  });
});
