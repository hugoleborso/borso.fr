import { describe, expect, it } from 'vitest';
import {
  buildVenueMapUrl,
  formatTicketDate,
  PRIZE_ICON_GLYPH,
  selectTicketLayout,
} from './concert-ticket.core';

// @FollowsBlueprint test-pure-unit
describe('the concert ticket', () => {
  it('reads the day, the month, the weekday and the hour in Paris', () => {
    expect(formatTicketDate('2026-12-17T19:00:00.000Z', 'fr')).toStrictEqual({
      day: '17',
      month: 'décembre',
      weekday: 'jeudi',
      hour: '20 h',
      shortDate: '17 déc.',
    });
    expect(formatTicketDate('2026-12-17T23:30:00.000Z', 'en')).toStrictEqual({
      day: '18',
      month: 'December',
      weekday: 'Friday',
      hour: '12:30 AM',
      shortDate: 'Dec 18',
    });
  });

  it('opens a map search for the venue as typed', () => {
    expect(buildVenueMapUrl('Punk Paradise')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Punk+Paradise',
    );
    expect(buildVenueMapUrl('Bar & Co, Paris')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Bar+%26+Co%2C+Paris',
    );
  });

  it('puts the poster on top when there is one, and the date otherwise', () => {
    expect(selectTicketLayout('https://cdn/poster.png')).toBe('poster');
    expect(selectTicketLayout(null)).toBe('date');
  });

  it('draws each prize with its own glyph, the beer as a pint', () => {
    expect(PRIZE_ICON_GLYPH).toStrictEqual({
      beer: 'pint',
      gift: 'gift',
      ticket: 'ticket',
      shirt: 'shirt',
    });
  });
});
