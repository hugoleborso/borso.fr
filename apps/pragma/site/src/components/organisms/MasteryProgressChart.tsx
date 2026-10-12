/** @Feature studies */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoreHistoryOfSong } from '../../lib/queries/studies.queries';
import { Card } from '../atoms/Card';
import { EnergySparkline } from '../molecules/EnergySparkline';
import { groupScoreChangesIntoSeries } from './mastery-progress.core';

export interface MasteryProgressChartProps {
  songId: string;
  members: readonly { id: string; firstName: string; color: string }[];
  instruments: readonly { id: string; name: string }[];
}

const SPARKLINE_HEIGHT = 40;

// @FollowsBlueprint organism-query-owning
export function MasteryProgressChart({
  songId,
  members,
  instruments,
}: MasteryProgressChartProps): JSX.Element | null {
  const { t } = useTranslation();
  const historyQuery = useScoreHistoryOfSong(songId);
  const series = useMemo(
    () => groupScoreChangesIntoSeries(historyQuery.data?.changes ?? [], members, instruments),
    [historyQuery.data, members, instruments],
  );
  if (series.length === 0) return null;
  return (
    <Card className="p-4 flex flex-col gap-3" data-testid="mastery-progress">
      <div className="text-xs tracking-wider uppercase text-ink-400 font-medium">
        {t('studies.progressTitle')}
      </div>
      <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-3">
        {series.map((entry) => (
          <li key={entry.key} className="flex flex-col gap-1">
            <span className="text-xs text-ink-700">
              {entry.memberName} · {entry.instrumentName} · {entry.scores.at(-1)}
            </span>
            <EnergySparkline
              values={entry.scores}
              height={SPARKLINE_HEIGHT}
              accent={entry.memberColor}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
