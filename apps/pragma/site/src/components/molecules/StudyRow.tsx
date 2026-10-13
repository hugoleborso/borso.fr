/** @Feature studies */

import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
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
        isStudiedToday ? 'border-accent bg-bg-elev' : 'border-line bg-bg',
      )}
      data-testid="study-row"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm text-ink-900 truncate">{title}</div>
        <div className="text-xs text-ink-500 flex items-center gap-1.5">
          <span>{instrumentName}</span>
          {readinessLabelKey === null ? null : (
            <span className={isReady === true ? 'text-ink-400' : 'text-danger'}>
              · {t(readinessLabelKey)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" aria-label={t('studies.scoreLabel')}>
          {isStudiedToday ? (
            <Button
              size="sm"
              variant="ghost"
              className="w-11"
              aria-label={t('studies.scoreDown')}
              onClick={() => onScoreStep(-1)}
            >
              −
            </Button>
          ) : null}
          <span
            className="w-8 text-center font-mono text-sm text-ink-900"
            data-testid="study-score"
          >
            {score ?? '—'}
          </span>
          {isStudiedToday ? (
            <Button
              size="sm"
              variant="ghost"
              className="w-11"
              aria-label={t('studies.scoreUp')}
              onClick={() => onScoreStep(1)}
            >
              +
            </Button>
          ) : null}
        </div>
        {isStudiedToday ? (
          <Button size="md" variant="default" onClick={onUndo}>
            <Icon name="check" size={14} />
            {t('studies.undo')}
          </Button>
        ) : (
          <Button size="md" variant="accent" onClick={onStudied}>
            {t('studies.studied')}
          </Button>
        )}
      </div>
    </li>
  );
}
