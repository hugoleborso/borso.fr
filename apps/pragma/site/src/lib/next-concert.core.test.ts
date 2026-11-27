import { describe, expect, it } from 'vitest';
import { buildMemberSetlistPath } from './next-concert.core';

describe('buildMemberSetlistPath', () => {
  it('filters the setlist to the member', () => {
    expect(buildMemberSetlistPath('set-1', 'member-1')).toBe('/setlists/set-1?member=member-1');
  });

  it('opens the whole setlist when nobody is signed in yet', () => {
    expect(buildMemberSetlistPath('set-1', '')).toBe('/setlists/set-1');
  });
});
