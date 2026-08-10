import { useTranslation } from 'react-i18next';
import type { RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerStatusKind, selectRunnerStatusLoop } from '../../lib/runner-status.utils';
import { FastestLapBadge } from '../atoms/FastestLapBadge';
import { Pill } from '../atoms/Pill';
import { Show } from '../atoms/Show';
import { RunnerAvatar } from './RunnerAvatar';
import { formatLastEventTime, formatRank } from './leaderboard-chip.utils';

const AVATAR_SIZE_PX = 32;

const STATUS_KEY_BY_KIND = {
  'in-race': 'leaderboard.loop',
  out: 'leaderboard.did-not-finish',
} as const;

interface LeaderboardChipProps {
  readonly entry: RankedRunnerDto;
  readonly hasFastestLap: boolean;
  readonly locale: string;
}

/** The chip body, shared by the tappable and the display only variants. */
// @FollowsBlueprint molecule-presentational
export function LeaderboardChip({ entry, hasFastestLap, locale }: LeaderboardChipProps) {
  const { t } = useTranslation();
  const statusKind = selectRunnerStatusKind(entry.status);
  return (
    <>
      <Show when={hasFastestLap}>
        <FastestLapBadge title={t('leaderboard.fastest-lap')} />
      </Show>
      <div className="leaderboard-chip__head">
        <span className="leaderboard-chip__rank mono">
          {formatRank(entry.rank, t('common.ex-aequo'))}
        </span>
        <RunnerAvatar runner={entry.runner} size={AVATAR_SIZE_PX} surface="leaderboard" />
        <span className="leaderboard-chip__name">{entry.runner.displayName}</span>
      </div>
      <div className="leaderboard-chip__foot">
        <Pill tone={statusKind}>
          {t(STATUS_KEY_BY_KIND[statusKind], { loop: selectRunnerStatusLoop(entry.status) })}
        </Pill>
        <span className="leaderboard-chip__time mono">
          {formatLastEventTime(entry.lastFinishedAt, locale, t('common.empty-value'))}
        </span>
      </div>
    </>
  );
}
