import { describe, expect, it } from 'vitest';
import { MONKEY_AVATARS, selectFreeAvatars } from './monkey.core';

// @FollowsBlueprint test-pure-unit
describe('selectFreeAvatars', () => {
  it('offers every avatar when nobody has arrived', () => {
    expect(selectFreeAvatars([])).toEqual(MONKEY_AVATARS);
  });

  it('leaves out the avatars already taken', () => {
    expect(selectFreeAvatars(['chimp', 'lemur'])).not.toContain('chimp');
    expect(selectFreeAvatars(['chimp', 'lemur'])).toContain('gibbon');
  });

  it('offers nothing when every avatar is taken', () => {
    expect(selectFreeAvatars(MONKEY_AVATARS)).toEqual([]);
  });
});
