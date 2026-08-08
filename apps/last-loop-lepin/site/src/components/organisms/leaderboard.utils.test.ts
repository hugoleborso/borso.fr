import { describe, expect, it } from 'vitest';
import { composeChipClassName, composeChipKey, selectChipInteractivity } from './leaderboard.utils';

describe('selectChipInteractivity', () => {
  it('makes the chip tappable when the parent supplied a handler', () => {
    expect(selectChipInteractivity(true)).toBe('tappable');
  });

  it('keeps the chip display only on a screen with no handler', () => {
    expect(selectChipInteractivity(false)).toBe('display-only');
  });
});

describe('composeChipClassName', () => {
  it('adds the out modifier for a runner who stopped', () => {
    expect(composeChipClassName(true)).toBe('leaderboard-chip leaderboard-chip--dnf');
  });

  it('leaves the class bare for a runner still going', () => {
    expect(composeChipClassName(false)).toBe('leaderboard-chip');
  });
});

describe('composeChipKey', () => {
  it('joins the edition and the runner slug', () => {
    expect(composeChipKey('lepin-2026', 'alice')).toBe('lepin-2026-alice');
  });
});
