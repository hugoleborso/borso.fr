/** @Feature studies */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type StudyQueueRow,
  useLogStudy,
  useSaveSongScore,
  useUndoStudy,
} from '../../lib/queries/studies.queries';
import { keepPinnedOrder, targetKey } from '../../lib/queries/studies.utils';
import { stepScore } from '../../routes/studies/studies-page.core';
import { StudyRow } from '../molecules/StudyRow';

export interface StudyQueueProps {
  memberId: string;
  rows: readonly StudyQueueRow[];
  instrumentNames: ReadonlyMap<string, string>;
}

// @FollowsBlueprint organism-query-owning
export function StudyQueue({ memberId, rows, instrumentNames }: StudyQueueProps): JSX.Element {
  const { t } = useTranslation();
  const logStudy = useLogStudy(memberId);
  const undoStudy = useUndoStudy(memberId);
  const saveScore = useSaveSongScore();
  const [pinnedKeys] = useState(() => rows.map((row) => targetKey(row)));
  const orderedRows = keepPinnedOrder(rows, pinnedKeys);
  if (rows.length === 0) {
    return <p className="text-sm text-ink-500 italic">{t('studies.queueEmpty')}</p>;
  }
  return (
    <ul className="flex flex-col gap-2 m-0 p-0 list-none">
      {orderedRows.map((row) => {
        const target = { songId: row.songId, instrumentId: row.instrumentId };
        return (
          <StudyRow
            key={`${row.songId}:${row.instrumentId}`}
            title={row.title}
            instrumentName={instrumentNames.get(row.instrumentId) ?? ''}
            score={row.score}
            isReady={row.isReady}
            isStudiedToday={row.isStudiedToday}
            onStudied={() => logStudy.mutate(target)}
            onUndo={() => undoStudy.mutate(target)}
            onScoreStep={(direction) =>
              saveScore.mutate({ ...target, memberId, score: stepScore(row.score, direction) })
            }
          />
        );
      })}
    </ul>
  );
}
