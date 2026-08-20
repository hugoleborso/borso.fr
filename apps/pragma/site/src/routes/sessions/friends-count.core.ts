/** @Feature sessions */

import { z } from 'zod';

const friendsCountShape = z.record(z.string().uuid(), z.number());

const NO_SHARE_PERCENT = 0;
const WHOLE_AS_PERCENT = 100;
const UNKNOWN_CAPACITY = 0;

// @FollowsBlueprint core-parse-untrusted
export function parseFriendsCounts(raw: unknown): Record<string, number> {
  const friendsCount = friendsCountShape.safeParse(raw);
  if (!friendsCount.success) return {};
  return friendsCount.data;
}

export function computeSharePercent(part: number, whole: number): number {
  if (whole === 0) return NO_SHARE_PERCENT;
  return (part / whole) * WHOLE_AS_PERCENT;
}

export function isCapacityKnown(capacity: number | null): capacity is number {
  return (capacity ?? UNKNOWN_CAPACITY) > UNKNOWN_CAPACITY;
}
