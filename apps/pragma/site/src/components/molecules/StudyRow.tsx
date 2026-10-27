/** @Feature studies */

import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { composeClassName } from '../atoms/class-name.utils';
import { selectReadinessLabelKey } from '../../routes/studies/studies-page.core';

export interface StudyRowProps {
  title: string;
  instrumentName: string;
  score: number | null;
  isReady: boolean | null;
  isStudiedToday: boolean;
  onStudied: () => void;
  onUndo: () => void;
  onScoreStep: (direction: 1 | -1) => void;
}

// @FollowsBlueprint molecule-presentational
export function StudyRow({
  title,
  instrumentName,
  score,
  isReady,
  isStudiedToday,
  onStudied,
  onUndo,
  onScoreStep,
}: StudyRowProps): JSX.Element {
  const { t } = useTranslation();
  const readinessLabelKey = selectReadinessLabelKey(isReady);
  return (
    <li
      className={composeClassName(
        'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-3 py-2 rounded-md border',
        isStudiedToday ? 'border-accent bg-leaf' : 'border-rule bg-paper',
      )}
      data-testid="study-row"
    >
      <div className="min-w-0 flex-1">
        <div className="text-meta text-ink truncate">{title}</div>
        <div className="text-meta text-ink-soft flex items-center gap-1.5">
          <span>{instrumentName}</span>
          {readinessLabelKey === null ? null : (
            <span className={isReady === true ? 'text-ink-soft' : 'text-danger'}>
              · {t(readinessLabelKey)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" aria-label={t('studies.scoreLabel')}>
          {isStudiedToday ? (
            <IconButton
              icon="minus"
              label={t('studies.scoreDown')}
              onClick={() => onScoreStep(-1)}
            />
          ) : null}
          <span
            className="w-8 text-center text-meta text-ink tabular-nums"
            data-testid="study-score"
          >
            {score ?? '—'}
          </span>
          {isStudiedToday ? (
            <IconButton icon="plus" label={t('studies.scoreUp')} onClick={() => onScoreStep(1)} />
          ) : null}
        </div>
        {isStudiedToday ? (
          <Button variant="secondary" icon="refresh" onClick={onUndo}>
            {t('studies.undo')}
          </Button>
        ) : (
          <Button variant="primary" icon="check" onClick={onStudied}>
            {t('studies.studied')}
          </Button>
        )}
      </div>
    </li>
  );
}
