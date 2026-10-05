import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';

export interface DateSliderProps {
  readonly dateLabel: string;
  readonly position: number;
  readonly lastPosition: number;
  readonly isToday: boolean;
  readonly firstLabel: string;
  readonly onPositionChanged: (position: number) => void;
}

// @FollowsBlueprint molecule-presentational
export function DateSlider({
  dateLabel,
  position,
  lastPosition,
  isToday,
  firstLabel,
  onPositionChanged,
}: DateSliderProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 min-h-9">
        <p className="m-0 text-caption text-ink-muted">
          {t('graph.date-label')}{' '}
          <span className="font-display text-prose-heading text-ink">{dateLabel}</span>
        </p>
        {isToday ? (
          <Chip tone="patina">{t('graph.today')}</Chip>
        ) : (
          <Button variant="quiet" size="sm" onClick={() => onPositionChanged(lastPosition)}>
            {t('graph.today')}
          </Button>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={lastPosition}
        step={1}
        value={position}
        onChange={(event) => onPositionChanged(Number(event.target.value))}
        aria-label={t('graph.date-label')}
        aria-valuetext={dateLabel}
        className="w-full h-11 accent-bronze cursor-pointer"
      />
      <div className="flex justify-between text-caption text-ink-muted">
        <span>{firstLabel}</span>
        <span>{t('graph.today')}</span>
      </div>
    </div>
  );
}
