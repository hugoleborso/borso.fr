import { describe, expect, it } from 'vitest';
import { isUndoAllowed, selectCompletionMessageKey, selectLineLabel } from './playSession.core';
import type { Line, Opening, Variation } from './types';

const OPENING: Opening = {
  id: 'italian',
  name: 'Italian Game',
  ecoCodes: ['C50'],
  variations: [],
};

const VARIATION: Variation = { id: 'classical', name: 'Classical Variation', lines: [] };

const LINE: Line = {
  id: 'greco',
  name: "Italian Game: Classical Variation, Greco's Attack",
  eco: 'C54',
  movesSan: [],
  movesUci: [],
};

const BARE_LINE: Line = { ...LINE, name: 'Italian Game' };

// @FollowsBlueprint test-pure-unit
describe('selectLineLabel', () => {
  it('returns nothing while no opening is identified', () => {
    expect(
      selectLineLabel({ opening: undefined, variation: VARIATION, line: LINE }),
    ).toBeUndefined();
  });

  it('returns nothing while no variation is identified', () => {
    expect(selectLineLabel({ opening: OPENING, variation: undefined, line: LINE })).toBeUndefined();
  });

  it('returns nothing while no line is identified', () => {
    expect(
      selectLineLabel({ opening: OPENING, variation: VARIATION, line: undefined }),
    ).toBeUndefined();
  });

  it('returns the distinctive suffix of the line name', () => {
    expect(selectLineLabel({ opening: OPENING, variation: VARIATION, line: LINE })).toBe(
      "Greco's Attack",
    );
  });

  it('falls back to the variation name when the line adds nothing', () => {
    expect(selectLineLabel({ opening: OPENING, variation: VARIATION, line: BARE_LINE })).toBe(
      'Classical Variation',
    );
  });
});

describe('selectCompletionMessageKey', () => {
  it('names the line when one was identified', () => {
    expect(selectCompletionMessageKey("Greco's Attack")).toBe('play.completed.named');
  });

  it('stays generic when no line was identified', () => {
    expect(selectCompletionMessageKey(undefined)).toBe('play.completed.generic');
  });
});

describe('isUndoAllowed', () => {
  it('needs two moves to take back when the opponent plays itself', () => {
    expect(isUndoAllowed(1, true)).toBe(false);
    expect(isUndoAllowed(2, true)).toBe(true);
  });

  it('needs one move to take back when the user plays both sides', () => {
    expect(isUndoAllowed(0, false)).toBe(false);
    expect(isUndoAllowed(1, false)).toBe(true);
  });
});
