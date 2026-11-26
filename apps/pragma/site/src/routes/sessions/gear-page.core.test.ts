import { describe, expect, it } from 'vitest';
import {
  type GearPageItem,
  gearHoldingChoiceKey,
  readGearHoldingChoice,
  selectGearFilterChips,
  selectGearLabelRefusal,
  selectGearPageView,
  selectGearSummary,
  selectOfferedCopySource,
} from './gear-page.core';

const BORSO = 'borso-member-id';
const COSYN = 'cosyn-member-id';

function item(overrides: Partial<GearPageItem> & Pick<GearPageItem, 'id'>): GearPageItem {
  return { label: overrides.id, status: 'to_find', memberId: null, position: 0, ...overrides };
}

const MULTIPRISE = item({ id: 'multiprise', position: 2 });
const RETOUR = item({ id: 'retour', position: 1 });
const SONO = item({ id: 'sono', status: 'asked_of_venue', position: 3 });
const AMPLI = item({ id: 'ampli', status: 'have', memberId: BORSO, position: 4 });
const PEDALES = item({ id: 'pedales', status: 'have', memberId: COSYN, position: 5 });
const ITEMS = [MULTIPRISE, SONO, AMPLI, PEDALES, RETOUR];

// @FollowsBlueprint test-pure-unit
describe('selectGearPageView', () => {
  it('lays every item out in sections to find, asked of the venue, then had, in list order', () => {
    const view = selectGearPageView(ITEMS, { filter: 'all', isMineOnly: false, memberId: BORSO });
    expect(view.sections).toStrictEqual([
      { status: 'to_find', items: [RETOUR, MULTIPRISE] },
      { status: 'asked_of_venue', items: [SONO] },
      { status: 'have', items: [AMPLI, PEDALES] },
    ]);
    expect(view.counts).toStrictEqual({ all: 5, to_find: 2, asked_of_venue: 1, have: 2 });
  });

  it('keeps only the section of the picked chip, with every count still shown', () => {
    const view = selectGearPageView(ITEMS, {
      filter: 'asked_of_venue',
      isMineOnly: false,
      memberId: BORSO,
    });
    expect(view.sections).toStrictEqual([{ status: 'asked_of_venue', items: [SONO] }]);
    expect(view.counts.all).toBe(5);
  });

  it('keeps what the signed-in member has under Moi, counts and empty sections included', () => {
    const view = selectGearPageView(ITEMS, { filter: 'all', isMineOnly: true, memberId: BORSO });
    expect(view.sections).toStrictEqual([{ status: 'have', items: [AMPLI] }]);
    expect(view.counts).toStrictEqual({ all: 1, to_find: 0, asked_of_venue: 0, have: 1 });
  });

  it('breaks a position tie by label, then by id', () => {
    const second = item({ id: 'b', label: 'Câble' });
    const first = item({ id: 'a', label: 'Câble' });
    const byLabel = item({ id: 'c', label: 'Ampli' });
    const view = selectGearPageView([second, first, byLabel], {
      filter: 'to_find',
      isMineOnly: false,
      memberId: null,
    });
    expect(view.sections[0]?.items).toStrictEqual([byLabel, first, second]);
  });
});

describe('selectOfferedCopySource', () => {
  it('offers Reprendre only on an empty list with an earlier concert to copy', () => {
    const earlier = { sessionId: 'earlier' };
    expect(selectOfferedCopySource(0, earlier)).toBe(earlier);
    expect(selectOfferedCopySource(0, null)).toBeNull();
    expect(selectOfferedCopySource(1, earlier)).toBeNull();
  });
});

describe('selectGearFilterChips', () => {
  it('names All in words and each status by its icon, with the count and the pressed chip', () => {
    const counts = { all: 5, to_find: 2, asked_of_venue: 1, have: 2 };
    expect(selectGearFilterChips(counts, 'have')).toStrictEqual([
      { filter: 'all', labelKey: 'common.all', icon: null, count: 5, isPressed: false },
      {
        filter: 'to_find',
        labelKey: 'gear.status.to_find',
        icon: 'pending',
        count: 2,
        isPressed: false,
      },
      {
        filter: 'asked_of_venue',
        labelKey: 'gear.status.asked_of_venue',
        icon: 'venue',
        count: 1,
        isPressed: false,
      },
      { filter: 'have', labelKey: 'gear.status.have', icon: 'check', count: 2, isPressed: true },
    ]);
  });
});

describe('selectGearSummary', () => {
  it('counts each status and shares the bar between had and asked of the venue', () => {
    expect(selectGearSummary(ITEMS)).toStrictEqual({
      counts: { to_find: 2, asked_of_venue: 1, have: 2 },
      havePercent: 40,
      venuePercent: 20,
    });
  });

  it('has nothing to summarise before the list loads or when it is empty', () => {
    expect(selectGearSummary(null)).toBeNull();
    expect(selectGearSummary([])).toBeNull();
  });
});

describe('selectGearLabelRefusal', () => {
  it('refuses a blank label and one past the limit, and accepts the limit itself', () => {
    expect(selectGearLabelRefusal('   ')).toBe('empty');
    expect(selectGearLabelRefusal('x'.repeat(129))).toBe('too-long');
    expect(selectGearLabelRefusal(` ${'x'.repeat(128)} `)).toBeNull();
  });
});

describe('gear holding choice', () => {
  it('names a holding by its member, or by its status when nobody holds it', () => {
    expect(gearHoldingChoiceKey({ status: 'have', memberId: BORSO })).toBe(BORSO);
    expect(gearHoldingChoiceKey({ status: 'asked_of_venue', memberId: null })).toBe(
      'asked_of_venue',
    );
  });

  it('reads a choice back as a valid holding', () => {
    expect(readGearHoldingChoice('to_find')).toStrictEqual({ status: 'to_find', memberId: null });
    expect(readGearHoldingChoice('asked_of_venue')).toStrictEqual({
      status: 'asked_of_venue',
      memberId: null,
    });
    expect(readGearHoldingChoice(BORSO)).toStrictEqual({ status: 'have', memberId: BORSO });
  });
});
