import { describe, expect, it } from 'vitest';
import {
  BAR_STATUS_KEY,
  BAR_STATUSES,
  type BarFormValues,
  barFormValuesSchema,
  BLANK_BAR_FORM,
  buildBarFormInitial,
  buildBarPayloadFromFormValues,
  parseBarStatus,
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
      }),
    ).toMatchObject({ capacity: '80', city: 'Lyon' });
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
