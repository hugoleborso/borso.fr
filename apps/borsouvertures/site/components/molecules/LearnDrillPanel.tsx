import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import type { ValueByFlag } from '@/lib/componentTable.types';
import { learnTreeMachine } from '@/openings/machineInstances';

const ARROW_LABEL_KEY_BY_VISIBILITY: ValueByFlag<'learn.arrows.hide' | 'learn.arrows.reveal'> = {
  true: 'learn.arrows.hide',
  false: 'learn.arrows.reveal',
};

const ARROW_ACTION_BY_VISIBILITY: ValueByFlag<() => void> = {
  true: learnTreeMachine.hideArrows,
  false: learnTreeMachine.revealArrows,
};

interface LearnDrillPanelProps {
  variationName: string;
  areArrowsRevealed: boolean;
}

export function LearnDrillPanel({ variationName, areArrowsRevealed }: LearnDrillPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="panel">
      <h3>{t('learn.title', { variation: variationName })}</h3>
      <p>{t('learn.description')}</p>
      <div className="controls-row">
        <Button label={t('learn.reset')} onActivate={learnTreeMachine.reset} />
        <Button
          label={t(ARROW_LABEL_KEY_BY_VISIBILITY[`${areArrowsRevealed}`])}
          onActivate={ARROW_ACTION_BY_VISIBILITY[`${areArrowsRevealed}`]}
        />
      </div>
    </div>
  );
}
