import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  runWithWritesToTableHeld,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { deleteMemberWithLinks } from '../members/members.repository';
import {
  listStoredCalendarFeeds,
  upsertCalendarFeed,
} from '../calendar-feeds/calendar-feeds.repository';
import { calendarFeedTable } from '../calendar-feeds/calendar-feeds.schema';

const SECRET_ADDRESS = 'https://calendar.example.com/private-0123abcd/basic.ics';
const SECOND_ADDRESS = 'https://calendar.example.com/private-4567efgh/basic.ics';
const SECRET_FRAGMENT = 'private-0123abcd';
const LOWER_TWIN_ID = '00000000-0000-4000-8000-000000000001';
const HIGHER_TWIN_ID = 'ffffffff-ffff-4fff-bfff-ffffffffffff';

const calendarFeedsSchema = z.object({
  calendarFeeds: z.array(z.object({ id: z.string(), name: z.string().nullable() })),
});
const freeSlotsSchema = z.object({
  slots: z.array(z.object({ start: z.string(), end: z.string() })),
  excludedMembers: z.array(
    z.object({
      memberId: z.string(),
      reason: z.string(),
      calendarName: z.string().nullable(),
      calendarPosition: z.number().nullable(),
    }),
  ),
});

function icsResponse(lines: readonly string[]): Response {
  return new Response(['BEGIN:VCALENDAR', ...lines, 'END:VCALENDAR'].join('\r\n'), {
    status: 200,
  });
}

const NAME_BY_ADDRESS_FRAGMENT: readonly (readonly [string, string | null])[] = [
  ['4567', 'Band'],
  ['zz-unnamed', null],
  ['twin', 'Twin'],
];

function namedCalendarOf(address: string): Response {
  const match = NAME_BY_ADDRESS_FRAGMENT.find(([fragment]) => address.includes(fragment));
  const name = match === undefined ? 'Work' : match[1];
  return icsResponse(name === null ? [] : [`X-WR-CALNAME:${name}`]);
}

async function postFeed(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
  address: string,
): Promise<Response> {
  return await jsonRequest(app, '/api/me/calendar-feeds', {
    method: 'POST',
    body: { address },
    cookieHeader,
  });
}

function answerEveryFeedWithItsName(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(namedCalendarOf(new Request(input).url)),
  );
}

// @FollowsBlueprint test-back-e2e
describe('calendar feeds and free slots (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    answerEveryFeedWithItsName();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects every calendar route without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const save = await jsonRequest(app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address: SECRET_ADDRESS },
    });
    const slots = await jsonRequest(app, '/api/free-slots');
    expect(save.status).toBe(401);
    expect(slots.status).toBe(401);
  });

  it('saves an address under the name its feed declares, and never sends the address back', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const saved = await jsonRequest(app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address: SECRET_ADDRESS },
      cookieHeader,
    });
    const savedText = await saved.text();
    expect(savedText).not.toContain(SECRET_FRAGMENT);
    const { calendarFeeds } = calendarFeedsSchema.parse(JSON.parse(savedText));
    expect(calendarFeeds.map((feed) => feed.name)).toStrictEqual(['Work']);

    const signedInMember = await jsonRequest(app, '/api/me', { cookieHeader });
    const meText = await signedInMember.text();
    expect(meText).not.toContain(SECRET_FRAGMENT);
    expect(calendarFeedsSchema.parse(JSON.parse(meText)).calendarFeeds).toStrictEqual(
      calendarFeeds,
    );
  });

  it('keeps several calendars of one member, and saving one twice keeps one copy', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    for (const address of [SECRET_ADDRESS, SECOND_ADDRESS, SECRET_ADDRESS]) {
      await jsonRequest(app, '/api/me/calendar-feeds', {
        method: 'POST',
        body: { address },
        cookieHeader,
      });
    }
    const signedInMember = await readJson(
      await jsonRequest(app, '/api/me', { cookieHeader }),
      calendarFeedsSchema,
    );
    expect(signedInMember.calendarFeeds.map((feed) => feed.name)).toStrictEqual(['Band', 'Work']);
    expect(await listStoredCalendarFeeds()).toHaveLength(2);
  });

  it('lists unnamed calendars last, and two calendars of one name by id', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    for (const address of ['https://calendar.example.com/zz-unnamed.ics', SECOND_ADDRESS]) {
      await postFeed(app, cookieHeader, address);
    }
    const now = new Date();
    await testDatabase()
      .insert(calendarFeedTable)
      .values([
        {
          id: HIGHER_TWIN_ID,
          memberId,
          address: 'https://a.example/twin-b.ics',
          name: 'Twin',
          updatedAt: now,
        },
        {
          id: LOWER_TWIN_ID,
          memberId,
          address: 'https://a.example/twin-a.ics',
          name: 'Twin',
          updatedAt: now,
        },
      ]);
    const signedInMember = await readJson(
      await jsonRequest(app, '/api/me', { cookieHeader }),
      calendarFeedsSchema,
    );
    expect(signedInMember.calendarFeeds.map((feed) => feed.name)).toStrictEqual([
      'Band',
      'Twin',
      'Twin',
      null,
    ]);
    expect(signedInMember.calendarFeeds.slice(1, 3).map((feed) => feed.id)).toStrictEqual([
      LOWER_TWIN_ID,
      HIGHER_TWIN_ID,
    ]);
  });

  it('refreshes the name when the same address is saved again', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await postFeed(app, cookieHeader, SECRET_ADDRESS);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(icsResponse(['X-WR-CALNAME:Renamed']));
    const saved = await readJson(
      await postFeed(app, cookieHeader, SECRET_ADDRESS),
      calendarFeedsSchema,
    );
    expect(saved.calendarFeeds.map((feed) => feed.name)).toStrictEqual(['Renamed']);
  });

  it('holds the cap when two calendars are added at once to a member one short of it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    for (let index = 0; index < CALENDAR_FEEDS_PER_MEMBER_MAX - 1; index++) {
      await postFeed(app, cookieHeader, `https://calendar.example.com/feed-${String(index)}.ics`);
    }
    const responses = await runWithWritesToTableHeld('calendar_feed', 2, async () =>
      Promise.all([
        postFeed(app, cookieHeader, SECRET_ADDRESS),
        postFeed(app, cookieHeader, SECOND_ADDRESS),
      ]),
    );
    expect(
      responses.map((response) => response.status).toSorted((left, right) => left - right),
    ).toStrictEqual([200, 409]);
    expect(await listStoredCalendarFeeds()).toHaveLength(CALENDAR_FEEDS_PER_MEMBER_MAX);
  });

  it('keeps one copy when the same address is added twice at once', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const responses = await runWithWritesToTableHeld('calendar_feed', 2, async () =>
      Promise.all([
        postFeed(app, cookieHeader, SECRET_ADDRESS),
        postFeed(app, cookieHeader, SECRET_ADDRESS),
      ]),
    );
    expect(responses.map((response) => response.status)).toStrictEqual([200, 200]);
    expect(await listStoredCalendarFeeds()).toHaveLength(1);
  });

  it('writes no calendar for a member deleted before the save', async () => {
    const outcome = await upsertCalendarFeed({
      memberId: '00000000-0000-4000-8000-000000000000',
      address: SECRET_ADDRESS,
      name: null,
      now: new Date(),
    });
    expect(outcome).toBe('member-gone');
    expect(await listStoredCalendarFeeds()).toStrictEqual([]);
  });

  it('saves a calendar with no name when its feed cannot be read yet', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const saved = await readJson(
      await jsonRequest(app, '/api/me/calendar-feeds', {
        method: 'POST',
        body: { address: SECRET_ADDRESS },
        cookieHeader,
      }),
      calendarFeedsSchema,
    );
    expect(saved.calendarFeeds.map((feed) => feed.name)).toStrictEqual([null]);
  });

  it('refuses one calendar more than the cap, and says why', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    for (let index = 0; index < CALENDAR_FEEDS_PER_MEMBER_MAX; index++) {
      await jsonRequest(app, '/api/me/calendar-feeds', {
        method: 'POST',
        body: { address: `https://calendar.example.com/feed-${String(index)}.ics` },
        cookieHeader,
      });
    }
    const refused = await jsonRequest(app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address: SECRET_ADDRESS },
      cookieHeader,
    });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toStrictEqual({ error: 'too-many-calendar-feeds' });
    expect(await listStoredCalendarFeeds()).toHaveLength(CALENDAR_FEEDS_PER_MEMBER_MAX);
  });

  it('turns a webcal address into https before storing it', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/calendar-feeds', {
      method: 'POST',
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
    const response = await jsonRequest(app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address },
      cookieHeader,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: 'invalid-feed-address' });
    expect(await listStoredCalendarFeeds()).toStrictEqual([]);
  });

  it('removes the one calendar named, and never one of another member', async () => {
    const owner = await buildAuthenticatedApp('Owner');
    const other = await buildAuthenticatedApp('Other');
    const saved = await readJson(
      await jsonRequest(owner.app, '/api/me/calendar-feeds', {
        method: 'POST',
        body: { address: SECRET_ADDRESS },
        cookieHeader: owner.cookieHeader,
      }),
      calendarFeedsSchema,
    );
    await jsonRequest(owner.app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address: SECOND_ADDRESS },
      cookieHeader: owner.cookieHeader,
    });
    const workId = saved.calendarFeeds[0]?.id ?? '';

    await jsonRequest(other.app, `/api/me/calendar-feeds/${workId}`, {
      method: 'DELETE',
      cookieHeader: other.cookieHeader,
    });
    expect(await listStoredCalendarFeeds()).toHaveLength(2);

    const removed = await readJson(
      await jsonRequest(owner.app, `/api/me/calendar-feeds/${workId}`, {
        method: 'DELETE',
        cookieHeader: owner.cookieHeader,
      }),
      calendarFeedsSchema,
    );
    expect(removed.calendarFeeds.map((feed) => feed.name)).toStrictEqual(['Band']);
  });

  it('deletes every address with its member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    for (const address of [SECRET_ADDRESS, SECOND_ADDRESS]) {
      await jsonRequest(app, '/api/me/calendar-feeds', {
        method: 'POST',
        body: { address },
        cookieHeader,
      });
    }
    await deleteMemberWithLinks(memberId);
    expect(await listStoredCalendarFeeds()).toStrictEqual([]);
  });

  it('lists a member without a calendar as excluded, and computes slots from nobody', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const freeSlots = await readJson(
      await jsonRequest(app, '/api/free-slots', { cookieHeader }),
      freeSlotsSchema,
    );
    expect(freeSlots.excludedMembers).toStrictEqual([
      { memberId, reason: 'no-calendar', calendarName: null, calendarPosition: null },
    ]);
  });

  it('subtracts every calendar of a member, and never puts an address in the slots response', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    for (const address of [SECRET_ADDRESS, SECOND_ADDRESS]) {
      await jsonRequest(app, '/api/me/calendar-feeds', {
        method: 'POST',
        body: { address },
        cookieHeader,
      });
    }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          icsResponse([
            'BEGIN:VEVENT',
            'UID:x',
            'DTSTART:20200101T180000Z',
            'DTEND:20200101T190000Z',
            'END:VEVENT',
          ]),
        ),
      );
    const response = await jsonRequest(app, '/api/free-slots', { cookieHeader });
    const text = await response.text();
    expect(text).not.toContain(SECRET_FRAGMENT);
    const freeSlots = freeSlotsSchema.parse(JSON.parse(text));
    expect(freeSlots.excludedMembers).toStrictEqual([]);
    expect(freeSlots.slots.length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledWith(SECRET_ADDRESS, expect.anything());
    expect(fetchSpy).toHaveBeenCalledWith(SECOND_ADDRESS, expect.anything());
  });

  it('names the calendar whose address is gone, and the one whose provider is down', async () => {
    const first = await buildAuthenticatedApp('First');
    const second = await buildAuthenticatedApp('Second');
    await jsonRequest(first.app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address: 'https://gone.example.com/feed.ics' },
      cookieHeader: first.cookieHeader,
    });
    await jsonRequest(second.app, '/api/me/calendar-feeds', {
      method: 'POST',
      body: { address: 'https://down.example.com/4567.ics' },
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
        {
          memberId: first.memberId,
          reason: 'needs-reconnecting',
          calendarName: 'Work',
          calendarPosition: 1,
        },
        {
          memberId: second.memberId,
          reason: 'unavailable',
          calendarName: 'Band',
          calendarPosition: 1,
        },
      ]),
    );
  });

  it('numbers a failing calendar with no name by its place in the member’s list', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    for (const address of [SECRET_ADDRESS, 'https://calendar.example.com/zz-unnamed.ics']) {
      await postFeed(app, cookieHeader, address);
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      Promise.resolve(
        new Response(null, { status: new Request(input).url.includes('unnamed') ? 503 : 404 }),
      ),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const freeSlots = await readJson(
      await jsonRequest(app, '/api/free-slots', { cookieHeader }),
      freeSlotsSchema,
    );
    expect(freeSlots.excludedMembers).toStrictEqual([
      { memberId, reason: 'needs-reconnecting', calendarName: 'Work', calendarPosition: 1 },
      { memberId, reason: 'unavailable', calendarName: null, calendarPosition: 2 },
    ]);
  });
});
