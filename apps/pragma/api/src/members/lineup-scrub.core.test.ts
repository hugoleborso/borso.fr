import { describe, expect, it } from 'vitest';
import { scrubMemberFromLineup } from './lineup-scrub.core';

const TARGET_MEMBER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const THIRD_MEMBER_ID = '33333333-3333-3333-3333-333333333333';
const GUITAR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BASS_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DRUMS_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('scrubMemberFromLineup', () => {
  it('returns an empty record when the input lineup is empty', () => {
    expect(scrubMemberFromLineup({}, TARGET_MEMBER_ID)).toEqual({});
  });

  it('returns a copy unchanged when the target member is absent', () => {
    const lineup = { [OTHER_MEMBER_ID]: GUITAR_ID };
    const scrubbed = scrubMemberFromLineup(lineup, TARGET_MEMBER_ID);
    expect(scrubbed).toEqual({ [OTHER_MEMBER_ID]: GUITAR_ID });
    expect(scrubbed).not.toBe(lineup);
  });

  it('removes the target member when present alone', () => {
    expect(scrubMemberFromLineup({ [TARGET_MEMBER_ID]: GUITAR_ID }, TARGET_MEMBER_ID)).toEqual({});
  });

  it('preserves the order of remaining members when the target sits in the middle', () => {
    const lineup = {
      [OTHER_MEMBER_ID]: GUITAR_ID,
      [TARGET_MEMBER_ID]: BASS_ID,
      [THIRD_MEMBER_ID]: DRUMS_ID,
    };
    expect(scrubMemberFromLineup(lineup, TARGET_MEMBER_ID)).toEqual({
      [OTHER_MEMBER_ID]: GUITAR_ID,
      [THIRD_MEMBER_ID]: DRUMS_ID,
    });
  });

  it('removes the target member even when their instrument is null (sitting out)', () => {
    const lineup = {
      [TARGET_MEMBER_ID]: null,
      [OTHER_MEMBER_ID]: GUITAR_ID,
    };
    expect(scrubMemberFromLineup(lineup, TARGET_MEMBER_ID)).toEqual({
      [OTHER_MEMBER_ID]: GUITAR_ID,
    });
  });
});
