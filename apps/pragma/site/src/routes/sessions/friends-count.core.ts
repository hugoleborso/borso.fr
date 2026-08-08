/**
 * The per-member friends count a concert session carries. The column
 * is a free-form JSON blob, so an unparsable value reads as "nobody
 * brought anyone" rather than throwing at render time.
 */

import { z } from 'zod';

const friendsCountShape = z.record(z.string().uuid(), z.number());

export function parseFriendsCounts(raw: unknown): Record<string, number> {
  const parsed = friendsCountShape.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data;
}
