import { GEAR_STATUSES, isGearHoldingValid } from '@domain/gear-status.core';
import { describe, expect, it } from 'vitest';
import { SEED_MEMBERS } from './test-seed-fixture.core';
import { SEED_GEAR_ITEMS, selectSeedGearHolding } from './test-seed-gear.core';

const MEMBER_ID_BY_NAME = new Map(
  SEED_MEMBERS.map((member, index) => [member.firstName, `member-${index}`]),
);

// @FollowsBlueprint test-pure-unit
describe('the seeded gear checklist', () => {
  it('shows every status, and one item held by the member a preview signs in as', () => {
    expect(new Set(SEED_GEAR_ITEMS.map((item) => item.status))).toEqual(new Set(GEAR_STATUSES));
    expect(SEED_GEAR_ITEMS.map((item) => item.holderFirstName)).toContain(
      SEED_MEMBERS[0]?.firstName,
    );
  });

  it('holds only valid pairs of status and member', () => {
    for (const item of SEED_GEAR_ITEMS) {
      expect(isGearHoldingValid(selectSeedGearHolding(item, MEMBER_ID_BY_NAME))).toBe(true);
    }
  });

  it('refuses a holder the fixture does not declare', () => {
    expect(() =>
      selectSeedGearHolding({ label: 'Sono', status: 'have', holderFirstName: 'Zoé' }, new Map()),
    ).toThrow('the seeded gear names no seeded member');
  });
});
