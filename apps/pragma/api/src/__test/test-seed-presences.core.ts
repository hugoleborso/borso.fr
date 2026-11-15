import { parisCalendarDay, shiftCalendarDay } from '@domain/paris-day.core';

export interface SeedPresence {
  readonly memberFirstName: string;
  readonly daysAgo: number;
}

const MIDDAY_UTC = 'T12:00:00Z';

// @FollowsBlueprint core-lookup-table
export const SEED_PRESENCES: readonly SeedPresence[] = [
  { memberFirstName: 'Hugo', daysAgo: 2 },
  { memberFirstName: 'Hugo', daysAgo: 3 },
  { memberFirstName: 'Hugo', daysAgo: 4 },
  { memberFirstName: 'Hugo', daysAgo: 5 },
  { memberFirstName: 'Léa', daysAgo: 0 },
];

// @FollowsBlueprint core-projection
export function seedPresenceInstant(now: Date, daysAgo: number): Date {
  const presentOn = shiftCalendarDay(parisCalendarDay(now), -daysAgo);
  return new Date(Math.min(now.getTime(), Date.parse(`${presentOn}${MIDDAY_UTC}`)));
}
