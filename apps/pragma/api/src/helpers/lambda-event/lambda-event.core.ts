import { STREAK_REMINDER_JOB } from '@domain/scheduled-job.core';
import { z } from 'zod';

const streakReminderEventSchema = z.object({ job: z.literal(STREAK_REMINDER_JOB) }).strict();

export type StreakReminderEvent = z.infer<typeof streakReminderEventSchema>;

// @FollowsBlueprint core-parse-untrusted
export function isStreakReminderEvent(event: unknown): event is StreakReminderEvent {
  return streakReminderEventSchema.safeParse(event).success;
}
