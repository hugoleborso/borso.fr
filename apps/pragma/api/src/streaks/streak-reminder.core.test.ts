import { describe, expect, it } from 'vitest';
import type { StreakReminderKey } from '../notifications/notifications.core';
import {
  buildStreakGroupKey,
  buildStreakPayload,
  countSentRemindersByKind,
  isReminderEvening,
  type ReminderSend,
  selectSendFailures,
  selectStreakReminders,
} from './streak-reminder.core';

const TODAY = '2026-10-29';
const LEA = 'member-lea';
const TOM = 'member-tom';
const ANA = 'member-ana';
const LEA_PHONE = { memberId: LEA, endpoint: 'https://push.example/lea' };
const TOM_PHONE = { memberId: TOM, endpoint: 'https://push.example/tom' };
const ANA_PHONE = { memberId: ANA, endpoint: 'https://push.example/ana' };
const EVERY_PHONE = [LEA_PHONE, TOM_PHONE, ANA_PHONE];

function flameOf(memberId: string, days: number, isTodayCounted: boolean) {
  return { memberId, flame: { days, isTodayCounted, jokersLeftThisWeek: 3 } };
}

// @FollowsBlueprint test-pure-unit
describe('selectStreakReminders', () => {
  it('warns a member whose open flame is above 2 days that it is at risk', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 3, false)],
      subscriptions: [LEA_PHONE],
      preferences: [],
    });
    expect(reminders).toEqual([
      {
        memberId: LEA,
        groupKey: `streak:${LEA}:${TODAY}`,
        messageKey: 'streak-at-risk',
        parameters: { days: '3' },
        recipients: [LEA_PHONE],
      },
    ]);
  });

  it('tells a member with a short flame how many members already counted today', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 2, false), flameOf(TOM, 1, true), flameOf(ANA, 4, true)],
      subscriptions: EVERY_PHONE,
      preferences: [],
    });
    expect(reminders).toEqual([
      {
        memberId: LEA,
        groupKey: `streak:${LEA}:${TODAY}`,
        messageKey: 'streak-band-count',
        parameters: { count: '2' },
        recipients: [LEA_PHONE],
      },
    ]);
  });

  it('uses the singular message when one member counted today', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 0, false), flameOf(TOM, 1, true)],
      subscriptions: EVERY_PHONE,
      preferences: [],
    });
    expect(reminders.map((reminder) => [reminder.messageKey, reminder.parameters])).toEqual([
      ['streak-band-count-one', { count: '1' }],
    ]);
  });

  it('sends nothing to a short flame when nobody counted today', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 2, false), flameOf(TOM, 0, false)],
      subscriptions: EVERY_PHONE,
      preferences: [],
    });
    expect(reminders).toEqual([]);
  });

  it('sends nothing to a member whose day already counted', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 12, true)],
      subscriptions: EVERY_PHONE,
      preferences: [],
    });
    expect(reminders).toEqual([]);
  });

  it('sends nothing to a member who turned the streak category off', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 5, false), flameOf(TOM, 5, false)],
      subscriptions: EVERY_PHONE,
      preferences: [
        { memberId: LEA, category: 'streak', enabled: false },
        { memberId: TOM, category: 'sessions', enabled: false },
      ],
    });
    expect(reminders.map((reminder) => reminder.memberId)).toEqual([TOM]);
  });

  it('sends nothing to a member with no subscription and carries on with the next', () => {
    const reminders = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 5, false), flameOf(TOM, 5, false)],
      subscriptions: [TOM_PHONE],
      preferences: [],
    });
    expect(reminders.map((reminder) => [reminder.memberId, reminder.recipients])).toEqual([
      [TOM, [TOM_PHONE]],
    ]);
  });
});

describe('buildStreakGroupKey', () => {
  it('claims one push per member and Paris day', () => {
    expect(buildStreakGroupKey(LEA, TODAY)).toBe('streak:member-lea:2026-10-29');
  });
});

describe('buildStreakPayload', () => {
  it('opens Home and replaces an earlier push of the same day through its tag', () => {
    const [reminder] = selectStreakReminders({
      today: TODAY,
      members: [flameOf(LEA, 12, false)],
      subscriptions: [LEA_PHONE],
      preferences: [],
    });
    if (reminder === undefined) throw new Error('no reminder selected');
    expect(buildStreakPayload(reminder)).toEqual({
      messageKey: 'streak-at-risk',
      parameters: { days: '12' },
      url: '/',
      tag: 'streak:member-lea:2026-10-29',
    });
  });
});

describe('isReminderEvening', () => {
  it('refuses a run before 20:00 Paris', () => {
    expect(isReminderEvening(19)).toBe(false);
  });

  it('accepts the 20:00 run', () => {
    expect(isReminderEvening(20)).toBe(true);
  });

  it('refuses a retry after midnight, which belongs to the next day', () => {
    expect(isReminderEvening(0)).toBe(false);
  });
});

function sent(messageKey: StreakReminderKey): PromiseSettledResult<ReminderSend> {
  return { status: 'fulfilled', value: { messageKey, outcome: 'sent' } };
}

const REFUSED = new Error('database refused the claim');
const REJECTED: PromiseSettledResult<ReminderSend> = { status: 'rejected', reason: REFUSED };

describe('countSentRemindersByKind', () => {
  it('counts the sent pushes per kind, the two band messages as one kind', () => {
    expect(
      countSentRemindersByKind([
        sent('streak-at-risk'),
        sent('streak-band-count'),
        sent('streak-at-risk'),
        sent('streak-band-count-one'),
      ]),
    ).toEqual([
      { kind: 'at-risk', count: 2 },
      { kind: 'band-count', count: 2 },
    ]);
  });

  it('leaves out a push already sent, one that timed out and one that threw', () => {
    expect(
      countSentRemindersByKind([
        { status: 'fulfilled', value: { messageKey: 'streak-at-risk', outcome: 'already-sent' } },
        { status: 'fulfilled', value: { messageKey: 'streak-at-risk', outcome: 'timed-out' } },
        REJECTED,
        sent('streak-band-count'),
      ]),
    ).toEqual([{ kind: 'band-count', count: 1 }]);
  });
});

describe('selectSendFailures', () => {
  it('keeps the reason of every send that threw, and nothing of the others', () => {
    expect(selectSendFailures([sent('streak-at-risk'), REJECTED])).toEqual([REFUSED]);
  });
});
