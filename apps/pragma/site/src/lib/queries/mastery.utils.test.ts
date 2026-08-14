import { describe, expect, it } from 'vitest';
import { upsertMasteryDefault, withoutMasteryDefault } from './mastery.utils';

const ALICE_ON_BASS = { memberId: 'alice', instrumentId: 'bass', score: 4 };
const BOB_ON_DRUMS = { memberId: 'bob', instrumentId: 'drums', score: 7 };

// @FollowsBlueprint test-pure-unit
describe('upsertMasteryDefault', () => {
  it('replaces the row for the same member and instrument', () => {
    expect(
      upsertMasteryDefault([ALICE_ON_BASS, BOB_ON_DRUMS], { ...ALICE_ON_BASS, score: 9 }),
    ).toStrictEqual([{ memberId: 'alice', instrumentId: 'bass', score: 9 }, BOB_ON_DRUMS]);
  });

  it('appends a row for a cell that has no score yet', () => {
    expect(upsertMasteryDefault([ALICE_ON_BASS], BOB_ON_DRUMS)).toStrictEqual([
      ALICE_ON_BASS,
      BOB_ON_DRUMS,
    ]);
  });

  it('keeps the same member on another instrument', () => {
    expect(
      upsertMasteryDefault([ALICE_ON_BASS], { memberId: 'alice', instrumentId: 'drums', score: 2 }),
    ).toStrictEqual([ALICE_ON_BASS, { memberId: 'alice', instrumentId: 'drums', score: 2 }]);
  });

  it('appends to an empty list', () => {
    expect(upsertMasteryDefault([], ALICE_ON_BASS)).toStrictEqual([ALICE_ON_BASS]);
  });
});

describe('withoutMasteryDefault', () => {
  it('drops the row for the cell', () => {
    expect(withoutMasteryDefault([ALICE_ON_BASS, BOB_ON_DRUMS], 'alice', 'bass')).toStrictEqual([
      BOB_ON_DRUMS,
    ]);
  });

  it('keeps every row when the cell has no score', () => {
    expect(withoutMasteryDefault([ALICE_ON_BASS], 'alice', 'drums')).toStrictEqual([ALICE_ON_BASS]);
  });

  it('keeps a row for another member on the same instrument', () => {
    expect(withoutMasteryDefault([ALICE_ON_BASS], 'bob', 'bass')).toStrictEqual([ALICE_ON_BASS]);
  });
});
