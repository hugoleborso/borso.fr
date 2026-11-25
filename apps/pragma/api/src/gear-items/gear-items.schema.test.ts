import { GEAR_ITEM_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { describe, expect, it } from 'vitest';
import {
  gearItemCreateSchema,
  gearItemSaveToolInputSchema,
  gearItemUpdateSchema,
} from './gear-items.schema';

const ITEM_ID = '00000000-0000-4000-8000-000000000001';
const MEMBER_ID = '00000000-0000-4000-8000-000000000002';

// @FollowsBlueprint test-pure-unit
describe('gearItemCreateSchema', () => {
  it('needs an id chosen by the device and a label, and starts the item at to find', () => {
    expect(gearItemCreateSchema.parse({ id: ITEM_ID, label: '  Sono  ' })).toEqual({
      id: ITEM_ID,
      label: 'Sono',
      status: 'to_find',
      memberId: null,
    });
    expect(gearItemCreateSchema.safeParse({ label: 'Sono' }).success).toBe(false);
  });

  it('refuses a blank label and one longer than the limit', () => {
    expect(gearItemCreateSchema.safeParse({ id: ITEM_ID, label: '   ' }).success).toBe(false);
    expect(
      gearItemCreateSchema.safeParse({ id: ITEM_ID, label: 'x'.repeat(GEAR_ITEM_LABEL_MAX_LENGTH) })
        .success,
    ).toBe(true);
    expect(
      gearItemCreateSchema.safeParse({
        id: ITEM_ID,
        label: 'x'.repeat(GEAR_ITEM_LABEL_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('accepts the three statuses and nothing else, and refuses a field it does not know', () => {
    for (const status of ['to_find', 'asked_of_venue', 'have']) {
      expect(gearItemCreateSchema.safeParse({ id: ITEM_ID, label: 'Sono', status }).success).toBe(
        true,
      );
    }
    expect(
      gearItemCreateSchema.safeParse({ id: ITEM_ID, label: 'Sono', status: 'loaded' }).success,
    ).toBe(false);
    expect(
      gearItemCreateSchema.safeParse({ id: ITEM_ID, label: 'Sono', quantity: 2 }).success,
    ).toBe(false);
  });
});

describe('gearItemUpdateSchema', () => {
  it('fills in no default, so a patch changes only what it names', () => {
    expect(gearItemUpdateSchema.parse({ label: 'Sono' })).toEqual({ label: 'Sono' });
    expect(gearItemUpdateSchema.parse({ status: 'have', memberId: MEMBER_ID })).toEqual({
      status: 'have',
      memberId: MEMBER_ID,
    });
  });
});

describe('gearItemSaveToolInputSchema', () => {
  it('needs the session, and takes a holder by name or null', () => {
    expect(gearItemSaveToolInputSchema.safeParse({ label: 'Sono' }).success).toBe(false);
    expect(
      gearItemSaveToolInputSchema.parse({ session: 'next-concert', label: 'Sono', holder: null }),
    ).toEqual({ session: 'next-concert', label: 'Sono', holder: null });
  });
});
