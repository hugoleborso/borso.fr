import { describe, expect, it } from 'vitest';
import { selectShownSection } from './section-tabs.core';

// @FollowsBlueprint test-pure-unit
describe('selectShownSection', () => {
  it('shows the section the reader chose while the screen still offers it', () => {
    expect(selectShownSection(['session', 'ahead', 'retention'], 'ahead')).toBe('ahead');
  });

  it('falls back to the first section once the chosen one is no longer offered', () => {
    expect(selectShownSection(['session', 'retention'], 'ahead')).toBe('session');
  });
});
