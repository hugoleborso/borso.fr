import { describe, expect, it } from 'vitest';
import { buildConcertCalendar } from './concert-calendar.core';

const SESSION_ID = '11111111-2222-3333-4444-555555555555';
const CONCERT_START = new Date('2026-12-12T20:30:00.000Z');
const NOW = new Date('2026-11-27T10:00:00.000Z');

describe('buildConcertCalendar', () => {
  it('writes one event that starts at the concert, lasts two hours, and is named after the band and the venue', () => {
    expect(
      buildConcertCalendar({
        sessionId: SESSION_ID,
        date: CONCERT_START,
        venue: 'La Cave, Paris',
        message: 'Doors at 8.\nFree entry.',
        now: NOW,
      }),
    ).toBe(
      [
        'BEGIN:VCALENDAR',
        'PRODID:-//borso.fr//pragma//EN',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `UID:${SESSION_ID}@pragma.borso.fr`,
        'DTSTAMP:20261127T100000Z',
        'DTSTART:20261212T203000Z',
        'DTEND:20261212T223000Z',
        'SUMMARY:pragma · La Cave\\, Paris',
        'LOCATION:La Cave\\, Paris',
        'DESCRIPTION:Doors at 8.\\nFree entry.',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    );
  });

  it('names the event after the band alone and leaves out the place and the note a concert lacks', () => {
    const calendar = buildConcertCalendar({
      sessionId: SESSION_ID,
      date: CONCERT_START,
      venue: null,
      message: null,
      now: NOW,
    });
    expect(calendar).toContain('\r\nSUMMARY:pragma\r\n');
    expect(calendar).not.toContain('LOCATION');
    expect(calendar).not.toContain('DESCRIPTION');
  });
});
