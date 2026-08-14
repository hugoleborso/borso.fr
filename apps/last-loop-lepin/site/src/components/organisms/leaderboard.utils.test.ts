import { describe, expect, it } from 'vitest';
import { composeChipClassName, composeChipKey, selectChipInteractivity } from './leaderboard.utils';

// @FollowsBlueprint test-pure-unit
describe('selectChipInteractivity', () => {
  it('makes the chip tappable when the parent supplied a handler', () => {
    expect(selectChipInteractivity(true)).toBe('tappable');
  });

  it('keeps the chip display only on a screen with no handler', () => {
    expect(selectChipInteractivity(false)).toBe('display-only');
  });
});

describe('composeChipClassName', () => {
  it('dims the chip and tints its border for a runner who stopped', () => {
    expect(composeChipClassName(true)).toContain('opacity-75 bg-chip-out border-danger-line-soft');
  });

  it('keeps the raised surface and the plain border for a runner still going', () => {
    expect(composeChipClassName(false)).toContain('bg-bg-elev-2 border-line');
  });

  it('carries the shared chip frame in both states', () => {
    for (const className of [composeChipClassName(true), composeChipClassName(false)]) {
      expect(className).toContain('relative flex flex-col gap-1 px-3 py-2 mb-2 rounded-lg border');
      expect(className).toContain('[break-inside:avoid]');
    }
  });
});

describe('composeChipKey', () => {
  it('joins the edition and the runner slug', () => {
    expect(composeChipKey('lepin-2026', 'alice')).toBe('lepin-2026-alice');
  });
});
