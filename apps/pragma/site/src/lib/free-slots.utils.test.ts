import { describe, expect, it } from 'vitest';
import {
  formatFreeSlot,
  nameExclusions,
  selectExclusionMessageKey,
  selectFreeSlotsView,
} from './free-slots.utils';

describe('formatFreeSlot', () => {
  it('shows the day and the whole span in Paris time, whatever the browser zone', () => {
    expect(formatFreeSlot('2026-10-14T17:15:00.000Z', '2026-10-14T21:00:00.000Z', 'fr')).toEqual({
      day: 'mer. 14 oct.',
      hours: '19:15 – 23:00',
    });
    expect(formatFreeSlot('2026-10-14T17:15:00.000Z', '2026-10-14T21:00:00.000Z', 'en')).toEqual({
      day: 'Wed, Oct 14',
      hours: '19:15 – 23:00',
    });
  });

  it('shows midnight as 00:00', () => {
    expect(formatFreeSlot('2026-10-17T08:00:00.000Z', '2026-10-17T22:00:00.000Z', 'fr').hours).toBe(
      '10:00 – 00:00',
    );
  });
});

describe('nameExclusions', () => {
  it('names each excluded member, and a dash for one the list no longer holds', () => {
    expect(
      nameExclusions(
        [
          { memberId: 'a', reason: 'no-calendar', calendarName: null, calendarPosition: null },
          { memberId: 'gone', reason: 'unavailable', calendarName: 'Work', calendarPosition: 2 },
        ],
        [{ id: 'a', firstName: 'Léa' }],
      ),
    ).toStrictEqual([
      { firstName: 'Léa', reason: 'no-calendar', calendarName: null, calendarPosition: null },
      { firstName: '—', reason: 'unavailable', calendarName: 'Work', calendarPosition: 2 },
    ]);
  });
});

describe('selectExclusionMessageKey', () => {
  it('names the calendar that failed when its feed declared a name', () => {
    expect(
      selectExclusionMessageKey({
        firstName: 'Léa',
        reason: 'unavailable',
        calendarName: 'Work',
        calendarPosition: 1,
      }),
    ).toBe('freeSlots.excluded.unavailableNamed');
    expect(
      selectExclusionMessageKey({
        firstName: 'Léa',
        reason: 'needs-reconnecting',
        calendarName: 'Work',
        calendarPosition: 1,
      }),
    ).toBe('freeSlots.excluded.needsReconnectingNamed');
  });

  it('numbers a failing calendar with no name the way the Account page does', () => {
    const unnamed = { firstName: 'Léa', calendarName: null, calendarPosition: 2 };
    expect(selectExclusionMessageKey({ ...unnamed, reason: 'unavailable' })).toBe(
      'freeSlots.excluded.unavailableNumbered',
    );
    expect(selectExclusionMessageKey({ ...unnamed, reason: 'needs-reconnecting' })).toBe(
      'freeSlots.excluded.needsReconnectingNumbered',
    );
  });

  it('names the member alone when there is no calendar to name', () => {
    expect(
      selectExclusionMessageKey({
        firstName: 'Léa',
        reason: 'no-calendar',
        calendarName: null,
        calendarPosition: null,
      }),
    ).toBe('freeSlots.excluded.noCalendar');
  });
});

describe('selectFreeSlotsView', () => {
  const nobodyExcluded = { exclusions: [], memberCount: 4 };

  it('waits while the slots are loading', () => {
    expect(selectFreeSlotsView({ isLoaded: false, slotCount: 0, ...nobodyExcluded })).toBe(
      'loading',
    );
  });

  it('asks for a calendar when no member has one', () => {
    const noCalendar = { reason: 'no-calendar' } as const;
    expect(
      selectFreeSlotsView({
        isLoaded: true,
        slotCount: 0,
        exclusions: [noCalendar, noCalendar],
        memberCount: 2,
      }),
    ).toBe('no-calendar-at-all');
  });

  it('says there is no slot when some calendars were read and none left two hours', () => {
    expect(
      selectFreeSlotsView({
        isLoaded: true,
        slotCount: 0,
        exclusions: [{ reason: 'no-calendar' }, { reason: 'unavailable' }],
        memberCount: 2,
      }),
    ).toBe('no-slot');
  });

  it('lists the slots otherwise, even before the member list arrives', () => {
    expect(
      selectFreeSlotsView({ isLoaded: true, slotCount: 3, exclusions: [], memberCount: 0 }),
    ).toBe('slots');
  });
});
