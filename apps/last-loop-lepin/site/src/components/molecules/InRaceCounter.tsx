import { useTranslation } from 'react-i18next';
import type { RankedRunnerDto } from '../../lib/race.types';
import { countRunnersInRace } from '../organisms/punch-panel.core';

interface InRaceCounterProps {
  readonly ranked: readonly RankedRunnerDto[];
}

/** How many runners are still going, with how many are out beside it. */
export function InRaceCounter({ ranked }: InRaceCounterProps) {
  const { t } = useTranslation();
  const inRace = countRunnersInRace(ranked);
  return (
    <div className="in-race-counter">
      <div className="in-race-counter__main">
        <span className="in-race-counter__value mono">{inRace}</span>
        <span className="in-race-counter__label">{t('spectator.in-race-label')}</span>
      </div>
      <span className="in-race-counter__detail muted mono">
        {t('spectator.did-not-finish-count', { runners: ranked.length - inRace })}
      </span>
    </div>
  );
}
