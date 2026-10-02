import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { deleteMemberWithLinks } from '../members/members.repository';
import { listStoredCalendarFeeds } from '../calendar-feeds/calendar-feeds.repository';

const SECRET_ADDRESS = 'https://calendar.example.com/private-0123abcd/basic.ics';
const SECRET_FRAGMENT = 'private-0123abcd';

const calendarFeedSchema = z.object({ calendarFeed: z.enum(['connected', 'absent']) });
const signedInMemberSchema = z.object({ calendarFeed: z.enum(['connected', 'absent']) });
const freeSlotsSchema = z.object({
  slots: z.array(z.object({ start: z.string(), end: z.string() })),
  excludedMembers: z.array(z.object({ memberId: z.string(), reason: z.string() })),
});

function icsResponse(lines: readonly string[]): Response {
  return new Response(['BEGIN:VCALENDAR', ...lines, 'END:VCALENDAR'].join('\r\n'), {
    status: 200,
  });
}

// @FollowsBlueprint test-back-e2e
describe('calendar feeds and free slots (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects every calendar route without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const save = await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: SECRET_ADDRESS },
    });
    const slots = await jsonRequest(app, '/api/free-slots');
    expect(save.status).toBe(401);
    expect(slots.status).toBe(401);
  });

  it('saves an address, answers only "connected", and never sends the address back', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const saved = await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: SECRET_ADDRESS },
      cookieHeader,
    });
    const savedText = await saved.text();
    expect(savedText).not.toContain(SECRET_FRAGMENT);
    expect(calendarFeedSchema.parse(JSON.parse(savedText))).toStrictEqual({
      calendarFeed: 'connected',
    });

    const signedInMember = await jsonRequest(app, '/api/me', { cookieHeader });
    const meText = await signedInMember.text();
    expect(meText).not.toContain(SECRET_FRAGMENT);
    expect(signedInMemberSchema.parse(JSON.parse(meText)).calendarFeed).toBe('connected');
  });

  it('turns a webcal address into https before storing it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: 'webcal://calendar.example.com/feed.ics' },
      cookieHeader,
    });
    const [stored] = await listStoredCalendarFeeds();
    expect(stored?.address).toBe('https://calendar.example.com/feed.ics');
  });

  it.each([
    ['an internal address', 'https://127.0.0.1/feed.ics'],
    ['a malformed body', ''],
  ])('refuses %s with a fixed error that does not echo the input', async (_label, address) => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address },
      cookieHeader,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: 'invalid-feed-address' });
    expect(await listStoredCalendarFeeds()).toStrictEqual([]);
  });

  it('removes the address', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: SECRET_ADDRESS },
      cookieHeader,
    });
    const removed = await readJson(
      await jsonRequest(app, '/api/me/calendar-feed', { method: 'DELETE', cookieHeader }),
      calendarFeedSchema,
    );
    expect(removed.calendarFeed).toBe('absent');
    expect(await listStoredCalendarFeeds()).toStrictEqual([]);
  });

  it('deletes the address with its member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: SECRET_ADDRESS },
      cookieHeader,
    });
    await deleteMemberWithLinks(memberId);
    expect(await listStoredCalendarFeeds()).toStrictEqual([]);
  });

  it('lists a member without a calendar as excluded, and computes slots from nobody', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const freeSlots = await readJson(
      await jsonRequest(app, '/api/free-slots', { cookieHeader }),
      freeSlotsSchema,
    );
    expect(freeSlots.excludedMembers).toStrictEqual([{ memberId, reason: 'no-calendar' }]);
  });

  it('subtracts a read feed, and never puts the address in the slots response', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: SECRET_ADDRESS },
      cookieHeader,
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        icsResponse([
          'BEGIN:VEVENT',
          'UID:x',
          'DTSTART:20200101T180000Z',
          'DTEND:20200101T190000Z',
          'END:VEVENT',
        ]),
      );
    const response = await jsonRequest(app, '/api/free-slots', { cookieHeader });
    const text = await response.text();
    expect(text).not.toContain(SECRET_FRAGMENT);
    const freeSlots = freeSlotsSchema.parse(JSON.parse(text));
    expect(freeSlots.excludedMembers).toStrictEqual([]);
    expect(freeSlots.slots.length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledWith(SECRET_ADDRESS, expect.anything());
  });

  it('excludes a member whose address is gone, and one whose provider is down', async () => {
    const first = await buildAuthenticatedApp('First');
    const second = await buildAuthenticatedApp('Second');
    await jsonRequest(first.app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: 'https://gone.example.com/feed.ics' },
      cookieHeader: first.cookieHeader,
    });
    await jsonRequest(second.app, '/api/me/calendar-feed', {
      method: 'PUT',
      body: { address: 'https://down.example.com/feed.ics' },
      cookieHeader: second.cookieHeader,
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      Promise.resolve(
        new Response(null, { status: new Request(input).url.includes('gone') ? 404 : 503 }),
      ),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const freeSlots = await readJson(
      await jsonRequest(first.app, '/api/free-slots', { cookieHeader: first.cookieHeader }),
      freeSlotsSchema,
    );
    expect(freeSlots.excludedMembers).toStrictEqual(
      expect.arrayContaining([
        { memberId: first.memberId, reason: 'needs-reconnecting' },
        { memberId: second.memberId, reason: 'unavailable' },
      ]),
    );
  });
});
