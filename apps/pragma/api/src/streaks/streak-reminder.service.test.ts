import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AuthenticatedApp,
  buildAuthenticatedApp,
  jsonRequest,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  deviceEndpoint,
  readSentNotifications,
  stubPushService,
  subscribeDevice,
  turnCategory,
} from '../../../test/push-utils';
import { pushSubscriptionTable } from '../notifications/notifications.schema';
import { studyTable } from '../studies/studies.schema';
import { runStreakReminder } from './streak-reminder.service';

const PARIS_EVENING = new Date('2026-10-29T19:30:00.000Z');
const PARIS_HALF_PAST_MIDNIGHT = new Date('2026-10-29T23:30:00.000Z');
const TODAY = '2026-10-29';
const LAST_THREE_DAYS = ['2026-10-26', '2026-10-27', '2026-10-28'];
const GONE_STATUS = 410;
const SERVER_ERROR_STATUS = 500;

interface Band {
  readonly hugo: AuthenticatedApp;
  readonly lea: AuthenticatedApp;
  readonly tom: AuthenticatedApp;
  readonly send: ReturnType<typeof stubPushService>;
  readonly warnings: ReturnType<typeof silenceWarnings>;
  readonly productEvents: ReturnType<typeof silenceProductEvents>;
}

function silenceWarnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

function silenceProductEvents() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

async function logStudies(memberId: string, days: readonly string[]): Promise<void> {
  await testDatabase()
    .insert(studyTable)
    .values(
      days.map((studiedOn) => ({
        memberId,
        songId: randomUUID(),
        instrumentId: randomUUID(),
        studiedOn,
        createdAt: PARIS_EVENING,
      })),
    );
}

async function prepareBand(): Promise<Band> {
  const warnings = silenceWarnings();
  const productEvents = silenceProductEvents();
  const send = stubPushService();
  const hugo = await buildAuthenticatedApp('Hugo');
  const lea = await buildAuthenticatedApp('Léa');
  const tom = await buildAuthenticatedApp('Tom');
  await subscribeDevice(hugo, 'hugo-phone');
  await subscribeDevice(lea, 'lea-phone');
  await subscribeDevice(tom, 'tom-phone');
  await logStudies(hugo.memberId, LAST_THREE_DAYS);
  await logStudies(lea.memberId, [TODAY]);
  return { hugo, lea, tom, send, warnings, productEvents };
}

function failPushTo(band: Band, device: string, statusCode: number): void {
  band.send.mockImplementation(async (target) => {
    if (target.endpoint === deviceEndpoint(device)) {
      throw Object.assign(new Error('push service refused'), { statusCode });
    }
    return await Promise.resolve({ statusCode: 201, body: '', headers: {} });
  });
}

function readLoggedEvents(spy: { readonly mock: { readonly calls: unknown[][] } }): unknown[] {
  return spy.mock.calls.flatMap(([line]): unknown[] => {
    if (typeof line !== 'string') return [];
    try {
      const logged: unknown = JSON.parse(line);
      return [logged];
    } catch {
      return [];
    }
  });
}

async function listStoredEndpoints(): Promise<string[]> {
  const rows = await testDatabase()
    .select({ endpoint: pushSubscriptionTable.endpoint })
    .from(pushSubscriptionTable);
  return rows.map((row) => row.endpoint).sort();
}

beforeEach(async () => {
  await truncateAllTables(testDatabase());
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(PARIS_EVENING);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-back-e2e
describe('the 20:00 streak reminder (back-e2e)', () => {
  it('sends one push per open member and claims each group once when run twice', async () => {
    const band = await prepareBand();

    await runStreakReminder(PARIS_EVENING);
    await runStreakReminder(PARIS_EVENING);

    const sentInEndpointOrder = readSentNotifications(band.send).sort((first, second) =>
      first.endpoint.localeCompare(second.endpoint),
    );
    expect(sentInEndpointOrder).toEqual([
      {
        endpoint: deviceEndpoint('hugo-phone'),
        messageKey: 'streak-at-risk',
        parameters: { days: '3' },
        url: '/',
        tag: `streak:${band.hugo.memberId}:${TODAY}`,
      },
      {
        endpoint: deviceEndpoint('tom-phone'),
        messageKey: 'streak-band-count-one',
        parameters: { count: '1' },
        url: '/',
        tag: `streak:${band.tom.memberId}:${TODAY}`,
      },
    ]);
    expect(readLoggedEvents(band.productEvents)).toEqual(
      expect.arrayContaining([
        { event: 'streak_reminder_sent', kind: 'at-risk', count: 1 },
        { event: 'streak_reminder_sent', kind: 'band-count', count: 1 },
      ]),
    );
  });

  it('sends nothing when a session is dated today', async () => {
    const band = await prepareBand();
    await jsonRequest(band.hugo.app, '/api/sessions', {
      method: 'POST',
      body: { kind: 'practice', date: '2026-10-29T17:00:00.000Z' },
      cookieHeader: band.hugo.cookieHeader,
    });
    band.send.mockClear();

    await runStreakReminder(PARIS_EVENING);

    expect(band.send).not.toHaveBeenCalled();
  });

  it('sends nothing to a member who turned the streak category off', async () => {
    const band = await prepareBand();
    await turnCategory(band.tom, 'streak', false);

    await runStreakReminder(PARIS_EVENING);

    expect(readSentNotifications(band.send).map((sent) => sent.endpoint)).toEqual([
      deviceEndpoint('hugo-phone'),
    ]);
  });

  it('deletes an expired subscription and carries on', async () => {
    const band = await prepareBand();
    failPushTo(band, 'tom-phone', GONE_STATUS);

    await runStreakReminder(PARIS_EVENING);

    expect(band.send).toHaveBeenCalledTimes(2);
    expect(await listStoredEndpoints()).toEqual([
      deviceEndpoint('hugo-phone'),
      deviceEndpoint('lea-phone'),
    ]);
  });

  it('reports streak_push_failed and carries on', async () => {
    const band = await prepareBand();
    failPushTo(band, 'tom-phone', SERVER_ERROR_STATUS);

    await runStreakReminder(PARIS_EVENING);

    expect(band.send).toHaveBeenCalledTimes(2);
    expect(readLoggedEvents(band.warnings)).toContainEqual({
      event: 'streak_push_failed',
      host: 'web.push.apple.com',
      status: '500',
    });
    expect(await listStoredEndpoints()).toHaveLength(3);
  });

  it('sends nothing at 00:30 Paris, when a late retry would speak of the next day', async () => {
    const band = await prepareBand();
    vi.setSystemTime(PARIS_HALF_PAST_MIDNIGHT);

    await runStreakReminder(PARIS_HALF_PAST_MIDNIGHT);

    expect(band.send).not.toHaveBeenCalled();
    expect(readLoggedEvents(band.productEvents)).toContainEqual({
      event: 'streak_reminder_skipped',
      parisHour: 0,
    });
  });
});
