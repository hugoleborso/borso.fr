import type { CalendarDay } from '@domain/paris-day.core';
import {
  type CategoryPreference,
  isCategoryEnabled,
  type NotificationCategory,
  type NotificationPayload,
  type PersonalPushOutcome,
  type RecipientSubscription,
  type StreakReminderKey,
} from '../notifications/notifications.core';
import type { MemberFlame } from './streaks.types';

export const AT_RISK_MIN_DAYS = 3;
export const REMINDER_HOUR = 20;
export const STREAK_CATEGORY: NotificationCategory = 'streak';

const STREAK_REMINDER_URL = '/';
const SINGLE_MEMBER = 1;

export type StreakReminderKind = 'at-risk' | 'band-count';

const KIND_BY_MESSAGE_KEY = {
  'streak-at-risk': 'at-risk',
  'streak-band-count': 'band-count',
  'streak-band-count-one': 'band-count',
} as const satisfies Record<StreakReminderKey, StreakReminderKind>;

export interface StreakReminderInput<Subscription extends RecipientSubscription> {
  readonly today: CalendarDay;
  readonly members: readonly Pick<MemberFlame, 'memberId' | 'flame'>[];
  readonly subscriptions: readonly Subscription[];
  readonly preferences: readonly CategoryPreference[];
}

interface ReminderMessage {
  readonly messageKey: StreakReminderKey;
  readonly parameters: Readonly<Record<string, string>>;
}

export interface StreakReminder<Subscription> extends ReminderMessage {
  readonly memberId: string;
  readonly groupKey: string;
  readonly recipients: readonly Subscription[];
}

export interface StreakReminderCount {
  readonly kind: StreakReminderKind;
  readonly count: number;
}

function selectReminderMessage(flameDays: number, countedToday: number): ReminderMessage | null {
  if (flameDays >= AT_RISK_MIN_DAYS) {
    return { messageKey: 'streak-at-risk', parameters: { days: String(flameDays) } };
  }
  if (countedToday === 0) return null;
  return {
    messageKey: countedToday === SINGLE_MEMBER ? 'streak-band-count-one' : 'streak-band-count',
    parameters: { count: String(countedToday) },
  };
}

export function buildStreakGroupKey(memberId: string, day: CalendarDay): string {
  return `streak:${memberId}:${day}`;
}

export function isReminderEvening(parisHour: number): boolean {
  return parisHour >= REMINDER_HOUR;
}

// @FollowsBlueprint core-decision
export function selectStreakReminders<Subscription extends RecipientSubscription>(
  input: StreakReminderInput<Subscription>,
): StreakReminder<Subscription>[] {
  const countedToday = input.members.filter((member) => member.flame.isTodayCounted).length;
  return input.members.flatMap((member) => {
    if (member.flame.isTodayCounted) return [];
    const ownPreferences = input.preferences.filter(
      (preference) => preference.memberId === member.memberId,
    );
    if (!isCategoryEnabled(ownPreferences, STREAK_CATEGORY)) return [];
    const recipients = input.subscriptions.filter(
      (subscription) => subscription.memberId === member.memberId,
    );
    if (recipients.length === 0) return [];
    const message = selectReminderMessage(member.flame.days, countedToday);
    if (message === null) return [];
    return [
      {
        ...message,
        memberId: member.memberId,
        groupKey: buildStreakGroupKey(member.memberId, input.today),
        recipients,
      },
    ];
  });
}

export function buildStreakPayload(reminder: StreakReminder<unknown>): NotificationPayload {
  return {
    messageKey: reminder.messageKey,
    parameters: reminder.parameters,
    url: STREAK_REMINDER_URL,
    tag: reminder.groupKey,
  };
}

export interface ReminderSend {
  readonly messageKey: StreakReminderKey;
  readonly outcome: PersonalPushOutcome;
}

export function countSentRemindersByKind(
  sends: readonly PromiseSettledResult<ReminderSend>[],
): StreakReminderCount[] {
  const countByKind = new Map<StreakReminderKind, number>();
  for (const send of sends) {
    if (send.status === 'rejected' || send.value.outcome !== 'sent') continue;
    const kind = KIND_BY_MESSAGE_KEY[send.value.messageKey];
    countByKind.set(kind, (countByKind.get(kind) ?? 0) + 1);
  }
  return [...countByKind].map(([kind, count]) => ({ kind, count }));
}

export function selectSendFailures(
  sends: readonly PromiseSettledResult<ReminderSend>[],
): unknown[] {
  return sends.flatMap((send): unknown[] => (send.status === 'rejected' ? [send.reason] : []));
}
