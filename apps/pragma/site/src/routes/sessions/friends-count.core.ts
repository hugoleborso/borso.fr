/**
 * The per-member friends count a concert session carries, and the two
 * readings the concert view takes of it: each member's share of the guests,
 * and how full the venue is.
 *
 * The column is a free-form JSON blob, so an unparsable value reads as
 * "nobody brought anyone" rather than throwing at render time.
 */

import { z } from 'zod';

const friendsCountShape = z.record(z.string().uuid(), z.number());

const NO_SHARE_PERCENT = 0;
const WHOLE_AS_PERCENT = 100;

export function parseFriendsCounts(raw: unknown): Record<string, number> {
  const parsed = friendsCountShape.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data;
}

/**
 * Nobody's share of nothing is nothing, which is the reading that keeps the
 * bar at zero width instead of `NaN%`.
 */
export function computeSharePercent(part: number, whole: number): number {
  if (whole === 0) return NO_SHARE_PERCENT;
  return (part / whole) * WHOLE_AS_PERCENT;
}

/**
 * A capacity of zero is how the form spells "we never asked", so the venue
 * fill summary has nothing to compare against and stays hidden.
 */
export function isCapacityKnown(capacity: number | null): capacity is number {
  return capacity !== null && capacity > 0;
}
