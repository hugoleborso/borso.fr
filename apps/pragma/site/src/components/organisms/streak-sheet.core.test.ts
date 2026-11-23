import { describe, expect, it } from 'vitest';
import { sortMembersByFlame } from './streak-sheet.core';

function memberOf(firstName: string, days: number) {
  return { firstName, flame: { days } };
}

// @FollowsBlueprint test-pure-unit
describe('sortMembersByFlame', () => {
  it('puts the longest flame first, then orders a tie by first name', () => {
    const members = [
      memberOf('Marc', 0),
      memberOf('Sarah', 3),
      memberOf('Léa', 3),
      memberOf('Hugo', 5),
    ];
    expect(sortMembersByFlame(members).map((member) => member.firstName)).toEqual([
      'Hugo',
      'Léa',
      'Sarah',
      'Marc',
    ]);
    expect(members[0]?.firstName).toBe('Marc');
  });
});
