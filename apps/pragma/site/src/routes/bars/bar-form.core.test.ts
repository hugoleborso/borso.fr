import { describe, expect, it } from 'vitest';
import {
  BAR_STATUS_KEY,
  BAR_STATUSES,
  type BarFormValues,
  barFormValuesSchema,
  BLANK_BAR_FORM,
  buildBarFormFromPlace,
  buildBarFormInitial,
  buildBarPayloadFromFormValues,
  parseBarStatus,
  parseConcertMood,
  toggleSupport,
  selectBarFormTitleKind,
} from './bar-form.core';

const FILLED_VALUES: BarFormValues = {
  name: '  Le Zinc  ',
  status: 'contacted',
  notes: 'called twice',
  city: 'Lyon',
  capacity: '120',
  contactName: 'Ada',
  contactEmail: 'ada@example.com',
  contactPhone: '0102030405',
  ownerMemberId: 'member-1',
  concertMood: 'gig',
  availableSupport: ['pa-system'],
};

// @FollowsBlueprint test-pure-unit
describe('barFormValuesSchema', () => {
  it('accepts a filled form', () => {
    expect(barFormValuesSchema.safeParse(FILLED_VALUES).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(barFormValuesSchema.safeParse({ ...FILLED_VALUES, name: '   ' }).success).toBe(false);
  });

  it('rejects a non-numeric capacity', () => {
    expect(barFormValuesSchema.safeParse({ ...FILLED_VALUES, capacity: '12a' }).success).toBe(
      false,
    );
  });
});

describe('buildBarPayloadFromFormValues', () => {
  it('trims the name and keeps every filled field', () => {
    expect(buildBarPayloadFromFormValues(FILLED_VALUES)).toEqual({
      name: 'Le Zinc',
      status: 'contacted',
      notes: 'called twice',
      city: 'Lyon',
      capacity: 120,
      contactName: 'Ada',
      contactEmail: 'ada@example.com',
      contactPhone: '0102030405',
      ownerMemberId: 'member-1',
      concertMood: 'gig',
      availableSupport: ['pa-system'],
    });
  });

  it('maps every empty optional field to null', () => {
    expect(
      buildBarPayloadFromFormValues({
        ...FILLED_VALUES,
        city: '',
        capacity: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        ownerMemberId: '',
        concertMood: '',
        availableSupport: [],
      }),
    ).toEqual({
      name: 'Le Zinc',
      status: 'contacted',
      notes: 'called twice',
      city: null,
      capacity: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      ownerMemberId: null,
      concertMood: null,
      availableSupport: [],
    });
  });
});

describe('buildBarFormInitial', () => {
  it('turns every absent field into the empty string', () => {
    expect(
      buildBarFormInitial({
        id: 'bar-1',
        name: 'Le Zinc',
        status: 'lead',
        notes: '',
        city: null,
        capacity: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        ownerMemberId: null,
        concertMood: null,
        availableSupport: [],
      }),
    ).toEqual({
      id: 'bar-1',
      name: 'Le Zinc',
      status: 'lead',
      notes: '',
      city: '',
      capacity: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      ownerMemberId: '',
      concertMood: '',
      availableSupport: [],
    });
  });

  it('renders the capacity as a string', () => {
    expect(
      buildBarFormInitial({
        id: 'bar-2',
        name: 'Le Zinc',
        status: 'booked',
        notes: 'n',
        city: 'Lyon',
        capacity: 80,
        contactName: 'Ada',
        contactEmail: 'ada@example.com',
        contactPhone: '01',
        ownerMemberId: 'member-1',
        concertMood: 'ticketed',
        availableSupport: ['lights', 'sound-engineer'],
      }),
    ).toMatchObject({
      capacity: '80',
      city: 'Lyon',
      ownerMemberId: 'member-1',
      concertMood: 'ticketed',
      availableSupport: ['lights', 'sound-engineer'],
    });
  });
});

describe('buildBarFormFromPlace', () => {
  it('fills a blank form with what the place knows', () => {
    expect(
      buildBarFormFromPlace(
        { name: 'Le Zinc', city: 'Paris', phone: '01 02 03 04 05' },
        BLANK_BAR_FORM,
      ),
    ).toEqual({
      ...BLANK_BAR_FORM,
      id: null,
      name: 'Le Zinc',
      city: 'Paris',
      contactPhone: '01 02 03 04 05',
    });
  });

  it('leaves a field the place does not know empty', () => {
    expect(
      buildBarFormFromPlace({ name: 'Le Zinc', city: null, phone: null }, BLANK_BAR_FORM),
    ).toMatchObject({ city: '', contactPhone: '' });
  });

  it('always builds a new bar, never an edit of the one on screen', () => {
    const editing = { ...BLANK_BAR_FORM, id: 'bar-1' };
    expect(buildBarFormFromPlace({ name: 'X', city: null, phone: null }, editing).id).toBeNull();
  });
});

describe('toggleSupport', () => {
  it('adds a support the bar did not lend', () => {
    expect(toggleSupport([], 'lights')).toEqual(['lights']);
  });

  it('removes one it already lent', () => {
    expect(toggleSupport(['lights', 'pa-system'], 'lights')).toEqual(['pa-system']);
  });

  it('keeps the declared order whatever the order of the clicks', () => {
    expect(toggleSupport(['sound-engineer'], 'pa-system')).toEqual(['pa-system', 'sound-engineer']);
  });
});

describe('parseConcertMood', () => {
  it('reads every mood the select offers', () => {
    for (const mood of ['chill', 'gig', 'ticketed'] as const) {
      expect(parseConcertMood(mood)).toBe(mood);
    }
  });

  it('reads the empty choice as no mood yet', () => {
    expect(parseConcertMood('')).toBe('');
  });

  it('refuses a value the select never offered', () => {
    expect(parseConcertMood('enormous')).toBeNull();
  });
});

describe('selectBarFormTitleKind', () => {
  it('is new for the blank form', () => {
    expect(selectBarFormTitleKind(BLANK_BAR_FORM)).toBe('new');
  });

  it('is existing once the form carries an identifier', () => {
    expect(selectBarFormTitleKind({ ...BLANK_BAR_FORM, id: 'bar-1' })).toBe('existing');
  });
});

describe('parseBarStatus', () => {
  it('returns the status for every declared value', () => {
    for (const status of BAR_STATUSES) {
      expect(parseBarStatus(status)).toBe(status);
    }
  });

  it('returns null for an unknown value', () => {
    expect(parseBarStatus('sold')).toBeNull();
  });
});

describe('BAR_STATUS_KEY', () => {
  it('carries a translation key for every status', () => {
    expect(Object.keys(BAR_STATUS_KEY)).toEqual([...BAR_STATUSES]);
  });
});
