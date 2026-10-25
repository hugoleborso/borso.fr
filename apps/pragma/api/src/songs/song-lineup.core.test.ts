import { describe, expect, it } from 'vitest';
import { hasLineupChanged } from './song-lineup.core';

// @FollowsBlueprint test-pure-unit
describe('hasLineupChanged', () => {
  it('reads the same lineup, whatever the key order, as unchanged', () => {
    expect(
      hasLineupChanged(
        { hugo: ['drums'], lea: ['bass', 'vocals'] },
        { lea: ['bass', 'vocals'], hugo: ['drums'] },
      ),
    ).toBe(false);
    expect(hasLineupChanged({}, {})).toBe(false);
  });

  it('reads a member added or removed as a change', () => {
    expect(hasLineupChanged({ hugo: ['drums'] }, { hugo: ['drums'], lea: ['bass'] })).toBe(true);
    expect(hasLineupChanged({ hugo: ['drums'], lea: ['bass'] }, { hugo: ['drums'] })).toBe(true);
  });

  it('reads an instrument added, removed or replaced as a change', () => {
    expect(hasLineupChanged({ hugo: ['drums'] }, { hugo: ['drums', 'vocals'] })).toBe(true);
    expect(hasLineupChanged({ hugo: ['drums', 'vocals'] }, { hugo: ['drums'] })).toBe(true);
    expect(hasLineupChanged({ hugo: ['drums'] }, { hugo: ['guitar'] })).toBe(true);
    expect(hasLineupChanged({ hugo: ['drums', 'vocals'] }, { hugo: ['drums', 'guitar'] })).toBe(
      true,
    );
    expect(hasLineupChanged({ hugo: ['drums', 'vocals'] }, { hugo: ['vocals', 'drums'] })).toBe(
      true,
    );
  });
});
