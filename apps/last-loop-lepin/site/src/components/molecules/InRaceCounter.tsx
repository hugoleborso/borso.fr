import { useTranslation } from 'react-i18next';
import type { RankedRunnerDto } from '../../lib/race.types';
import { countRunnersInRace } from '../../lib/runner-status.utils';
import { BigCount } from '../atoms/BigCount';
import { MonoNote } from '../atoms/MonoNote';

interface InRaceCounterProps {
  readonly ranked: readonly RankedRunnerDto[];
}

// @FollowsBlueprint molecule-presentational
export function InRaceCounter({ ranked }: InRaceCounterProps) {
  const { t } = useTranslation();
  const inRace = countRunnersInRace(ranked);
  return (
    <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-line-soft">
      <BigCount count={inRace} caption={t('spectator.in-race-label')} />
      <MonoNote tracking="wide">
        {t('spectator.did-not-finish-count', { runners: ranked.length - inRace })}
      </MonoNote>
    </div>
  );
}
