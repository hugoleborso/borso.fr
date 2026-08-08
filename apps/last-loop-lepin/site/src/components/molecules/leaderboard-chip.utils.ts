/**
 * The two readings a leaderboard chip needs from an entry: the rank as it is
 * printed, and the wall clock time of the runner's last event.
 */

import { formatClockTime } from '../../lib/formatters.utils';

const EX_AEQUO = 'ex-aequo';

export function formatRank(rank: number | 'ex-aequo', exAequoLabel: string): string {
  if (rank === EX_AEQUO) return exAequoLabel;
  return `${rank}`;
}

/**
 * Time of the runner's last closed loop, or of the moment they went out. The
 * empty label stands in for a runner who never crossed the line, e.g. one
 * recorded as out on loop zero.
 */
export function formatLastEventTime(
  lastFinishedAt: string | null,
  locale: string,
  emptyLabel: string,
): string {
  if (lastFinishedAt === null) return emptyLabel;
  return formatClockTime(new Date(lastFinishedAt), locale);
}
