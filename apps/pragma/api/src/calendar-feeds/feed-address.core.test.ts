import { describe, expect, it } from 'vitest';
import { judgeFeedAddress } from './feed-address.core';

const GOOGLE_SECRET_ADDRESS =
  'https://calendar.google.com/calendar/ical/someone%40gmail.com/private-0123abcd/basic.ics';

describe('judgeFeedAddress', () => {
  it('accepts an https address and keeps it as given', () => {
    expect(judgeFeedAddress(`  ${GOOGLE_SECRET_ADDRESS}  `)).toStrictEqual({
      kind: 'accepted',
      address: GOOGLE_SECRET_ADDRESS,
    });
  });

  it('turns a webcal address into https', () => {
    expect(judgeFeedAddress('  webcal://p01-caldav.icloud.com/published/2/abc')).toStrictEqual({
      kind: 'accepted',
      address: 'https://p01-caldav.icloud.com/published/2/abc',
    });
  });

  it('accepts an explicit port 443, which the URL parser drops', () => {
    expect(judgeFeedAddress('https://outlook.office365.com:443/owa/calendar/x.ics')).toStrictEqual({
      kind: 'accepted',
      address: 'https://outlook.office365.com/owa/calendar/x.ics',
    });
  });

  it.each([
    ['not an address', 'my calendar'],
    ['plain http', 'http://calendar.example.com/feed.ics'],
    ['another scheme', 'file:///etc/passwd'],
    ['another port', 'https://calendar.example.com:9001/feed.ics'],
    ['the Lambda runtime API', 'https://127.0.0.1:9001/2018-06-01/runtime/invocation/next'],
    ['an IPv4 literal', 'https://169.254.169.254/latest/meta-data'],
    ['an IPv6 literal', 'https://[::1]/feed.ics'],
    ['localhost', 'https://localhost/feed.ics'],
    ['localhost written as a fully qualified name', 'https://localhost./feed.ics'],
    ['a localhost subdomain written as a fully qualified name', 'https://api.localhost./feed.ics'],
    ['a localhost subdomain', 'https://api.localhost/feed.ics'],
    ['a single-label host', 'https://intranet/feed.ics'],
    ['user info', 'https://someone:secret@calendar.example.com/feed.ics'],
    ['a user name alone', 'https://someone@calendar.example.com/feed.ics'],
    ['a password alone', 'https://:secret@calendar.example.com/feed.ics'],
    ['a loopback address written as a number', 'https://2130706433/feed.ics'],
    ['webcal pointing at a loopback address', 'webcal://127.0.0.1/feed.ics'],
  ])('rejects %s', (_label, raw) => {
    expect(judgeFeedAddress(raw)).toStrictEqual({ kind: 'rejected' });
  });
});
