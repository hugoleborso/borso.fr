import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import type { ValueByFlag } from '@/lib/componentTable.types';
import { learnTreeMachine } from '@/openings/machineInstances';

// @FollowsBlueprint component-lookup-table
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

// @FollowsBlueprint molecule-presentational
export function LearnDrillPanel({ variationName, areArrowsRevealed }: LearnDrillPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="pt-3 border-t-[3px] border-ink">
      <h2 className="mb-3 text-xl font-bold">{t('learn.title', { variation: variationName })}</h2>
      <p className="my-4">{t('learn.description')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button label={t('learn.reset')} onActivate={learnTreeMachine.reset} />
        <Button
          label={t(ARROW_LABEL_KEY_BY_VISIBILITY[`${areArrowsRevealed}`])}
          onActivate={ARROW_ACTION_BY_VISIBILITY[`${areArrowsRevealed}`]}
        />
      </div>
    </div>
  );
}
