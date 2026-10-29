import { describe, expect, it } from 'vitest';
import {
  BAND_CALENDAR_ID,
  bandCalendarSubscribeAddress,
  bandCalendarSubscriptionOf,
} from './band-calendar.utils';

describe('bandCalendarSubscribeAddress', () => {
  it('opens Google Calendar on the band calendar, its id encoded into the cid parameter', () => {
    expect(bandCalendarSubscribeAddress(BAND_CALENDAR_ID)).toBe(
      'https://calendar.google.com/calendar/r?cid=8a2a531ef70d4fcc1be6e3307de65c192f80d852d2be3fa812fe884e92ecb4b3%40group.calendar.google.com',
    );
  });
});

describe('bandCalendarSubscriptionOf', () => {
  it('walks an iPhone through steps, since Apple Calendar cannot open a private Google calendar', () => {
    expect(bandCalendarSubscriptionOf('iphone')).toBe('steps');
  });

  it('subscribes Android and a computer in one tap', () => {
    expect(bandCalendarSubscriptionOf('android')).toBe('one-tap');
    expect(bandCalendarSubscriptionOf('computer')).toBe('one-tap');
  });
});
