import { describe, expect, it } from 'vitest';
import {
  buildGearToolUpdate,
  projectGearItemsForTool,
  readGearHolderReference,
} from './gear-item-tool.core';

const BORSO_ID = 'member-borso';
const MEMBERS = [{ id: BORSO_ID, name: 'Borso' }];

// @FollowsBlueprint test-pure-unit
describe('projectGearItemsForTool', () => {
  it('names the member who has an item, the venue, or nobody', () => {
    expect(
      projectGearItemsForTool(
        [
          { label: 'Ampli basse', status: 'have', memberId: BORSO_ID },
          { label: 'Sono', status: 'asked_of_venue', memberId: null },
          { label: 'Multiprise', status: 'to_find', memberId: null },
        ],
        MEMBERS,
      ),
    ).toStrictEqual([
      { label: 'Ampli basse', holder: 'Borso' },
      { label: 'Sono', holder: 'venue' },
      { label: 'Multiprise', holder: null },
    ]);
  });

  it('keeps the identifier of a member who left the band, and no holder for a row with none', () => {
    expect(
      projectGearItemsForTool(
        [
          { label: 'Pied de micro', status: 'have', memberId: 'member-gone' },
          { label: 'Câble', status: 'have', memberId: null },
        ],
        MEMBERS,
      ),
    ).toStrictEqual([
      { label: 'Pied de micro', holder: 'member-gone' },
      { label: 'Câble', holder: null },
    ]);
  });
});

describe('readGearHolderReference', () => {
  it('reads null as to find, `venue` as asked of the venue, and `me` as held by the actor', () => {
    expect(readGearHolderReference(null, BORSO_ID)).toStrictEqual({
      kind: 'holding',
      holding: { status: 'to_find', memberId: null },
    });
    expect(readGearHolderReference(' Venue ', BORSO_ID)).toStrictEqual({
      kind: 'holding',
      holding: { status: 'asked_of_venue', memberId: null },
    });
    expect(readGearHolderReference('ME', BORSO_ID)).toStrictEqual({
      kind: 'holding',
      holding: { status: 'have', memberId: BORSO_ID },
    });
  });

  it('leaves any other word as a member to resolve', () => {
    expect(readGearHolderReference('Léa', BORSO_ID)).toStrictEqual({
      kind: 'member',
      reference: 'Léa',
    });
  });
});

describe('buildGearToolUpdate', () => {
  it('keeps only the label and the holding given', () => {
    expect(buildGearToolUpdate('Sono', undefined)).toStrictEqual({ label: 'Sono' });
    expect(buildGearToolUpdate(undefined, { status: 'to_find', memberId: null })).toStrictEqual({
      status: 'to_find',
      memberId: null,
    });
    expect(buildGearToolUpdate(undefined, undefined)).toStrictEqual({});
  });
});
