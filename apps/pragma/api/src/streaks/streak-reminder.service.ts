import { parisCalendarDay } from '@domain/paris-day.core';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { parisWallTimeOf } from '../helpers/paris-time/paris-time.core';
import { readPushAudience, sendPersonalPush } from '../notifications/notifications.service';
import {
  buildStreakPayload,
  countSentRemindersByKind,
  isReminderEvening,
  type ReminderSend,
  selectSendFailures,
  selectStreakReminders,
  STREAK_CATEGORY,
} from './streak-reminder.core';
import { readMemberFlames } from './streaks.service';

const STREAK_PUSH_FAILED = 'streak_push_failed';

// @FollowsBlueprint service-orchestration
export async function runStreakReminder(now: Date): Promise<void> {
  const parisHour = parisWallTimeOf(now).hour;
  const isEvening = isReminderEvening(parisHour);
  if (!isEvening) {
    recordProductEvent({ event: 'streak_reminder_skipped', parisHour });
    return;
  }
  const [members, audience] = await Promise.all([
    readMemberFlames(now),
    readPushAudience(STREAK_CATEGORY),
  ]);
  const reminders = selectStreakReminders({ today: parisCalendarDay(now), members, ...audience });
  const sends = await Promise.allSettled(
    reminders.map(async (reminder): Promise<ReminderSend> => {
      const outcome = await sendPersonalPush({
        groupKey: reminder.groupKey,
        recipients: reminder.recipients,
        payload: buildStreakPayload(reminder),
        now,
        failureName: STREAK_PUSH_FAILED,
      });
      return { messageKey: reminder.messageKey, outcome };
    }),
  );
  for (const { kind, count } of countSentRemindersByKind(sends)) {
    recordProductEvent({ event: 'streak_reminder_sent', kind, count });
  }
  const failures = selectSendFailures(sends);
  if (failures.length > 0) {
    throw new AggregateError(failures, 'the streak reminder failed for some members');
  }
}
