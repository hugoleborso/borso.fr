import { useTranslation } from 'react-i18next';
import type { RankedRunnerDto } from '../../lib/race.types';
import { countRunnersInRace } from '../../lib/runner-status.utils';

interface InRaceCounterProps {
  readonly ranked: readonly RankedRunnerDto[];
}

/** How many runners are still going, with how many are out beside it. */
// @FollowsBlueprint molecule-presentational
export function InRaceCounter({ ranked }: InRaceCounterProps) {
  const { t } = useTranslation();
  const inRace = countRunnersInRace(ranked);
  return (
    <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-line-soft">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[clamp(28px,5vw,40px)] font-bold tabular-nums leading-none tracking-[-0.02em] text-ink">
          {inRace}
        </span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
          {t('spectator.in-race-label')}
        </span>
      </div>
      <span className="font-mono tabular-nums text-[11px] tracking-[0.08em] text-ink-3">
        {t('spectator.did-not-finish-count', { runners: ranked.length - inRace })}
      </span>
    </div>
  );
}
