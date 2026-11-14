import { useTranslation } from 'react-i18next';
import type { LineStep } from '@/decks/card.core';
import { describeMoveInWords } from './move-words.utils';

interface LineStepCaptionProps {
  step: LineStep | null;
  position: number;
  stepCount: number;
}

// @FollowsBlueprint molecule-presentational
export function LineStepCaption({ step, position, stepCount }: LineStepCaptionProps) {
  const { t } = useTranslation();
  const notation = step?.notation ?? t('decks.line-stepper.start');
  const words = describeMoveInWords(t, step);
  return (
    <div className="flex flex-col min-h-11" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-base font-bold">{notation}</p>
        <p className="text-sm text-ink-muted tabular-nums">
          {t('decks.line-stepper.position', { position, total: stepCount })}
        </p>
      </div>
      <p className="truncate first-letter:uppercase">{words}</p>
    </div>
  );
}
