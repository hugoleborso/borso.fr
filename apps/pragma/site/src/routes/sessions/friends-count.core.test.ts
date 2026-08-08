import { describe, expect, it } from 'vitest';
import { parseFriendsCounts } from './friends-count.core';

const MEMBER_ID = '00000000-0000-4000-8000-000000000000';

describe('parseFriendsCounts', () => {
  it('keeps a well-formed record', () => {
    expect(parseFriendsCounts({ [MEMBER_ID]: 3 })).toEqual({ [MEMBER_ID]: 3 });
  });

  it('reads an unparsable value as empty', () => {
    expect(parseFriendsCounts('nope')).toEqual({});
    expect(parseFriendsCounts({ [MEMBER_ID]: 'three' })).toEqual({});
  });
});
