import { describe, expect, it } from 'vitest';
import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';
import { selectCalendarFeedErrorKey, selectCalendarFeedFormMode } from './calendar-feed-form.utils';

describe('selectCalendarFeedFormMode', () => {
  it('asks for an address when the member has no calendar, whatever was clicked before', () => {
    expect(selectCalendarFeedFormMode(0, false)).toBe('entering');
    expect(selectCalendarFeedFormMode(0, true)).toBe('entering');
  });

  it('lists the calendars, or opens the field once Add is clicked', () => {
    expect(selectCalendarFeedFormMode(1, false)).toBe('listing');
    expect(selectCalendarFeedFormMode(CALENDAR_FEEDS_PER_MEMBER_MAX - 1, true)).toBe('adding');
  });

  it('offers no field once the member holds the most calendars the API accepts', () => {
    expect(selectCalendarFeedFormMode(CALENDAR_FEEDS_PER_MEMBER_MAX, true)).toBe('full');
  });
});

describe('selectCalendarFeedErrorKey', () => {
  it('says the member holds too many calendars when the API answers 409', () => {
    expect(selectCalendarFeedErrorKey(409)).toBe('account.calendarFeedsFull');
  });

  it('says the address cannot be read for any other failure', () => {
    expect(selectCalendarFeedErrorKey(400)).toBe('account.calendarFeedInvalid');
    expect(selectCalendarFeedErrorKey(null)).toBe('account.calendarFeedInvalid');
  });
});
