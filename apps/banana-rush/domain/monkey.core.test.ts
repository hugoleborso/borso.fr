import { describe, expect, it } from 'vitest';
import { isMonkeyAvatar, MONKEY_AVATARS, selectFreeAvatars } from './monkey.core';

// @FollowsBlueprint test-pure-unit
describe('isMonkeyAvatar', () => {
  it('recognises every avatar the game ships', () => {
    expect(MONKEY_AVATARS.every((avatar) => isMonkeyAvatar(avatar))).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isMonkeyAvatar('banana')).toBe(false);
  });
});

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
