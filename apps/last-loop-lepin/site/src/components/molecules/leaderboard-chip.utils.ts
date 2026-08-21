import { formatClockTime } from '../../lib/formatters.utils';

const EX_AEQUO = 'ex-aequo';

// @FollowsBlueprint utils-formatter
export function formatRank(rank: number | 'ex-aequo', exAequoLabel: string): string {
  if (rank === EX_AEQUO) return exAequoLabel;
  return `${rank}`;
}

export function formatLastEventTime(
  lastFinishedAt: string | null,
  locale: string,
  emptyLabel: string,
): string {
  if (lastFinishedAt === null) return emptyLabel;
  return formatClockTime(new Date(lastFinishedAt), locale);
}
