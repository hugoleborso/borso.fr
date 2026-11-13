import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import type { ValueByFlag } from '@/lib/componentTable.types';
import { learnTreeMachine } from '@/openings/machineInstances';
import type { LearnDrillActionsProps } from './drill-actions.types';

// @FollowsBlueprint component-lookup-table
const ARROW_LABEL_KEY_BY_VISIBILITY: ValueByFlag<'learn.arrows.hide' | 'learn.arrows.reveal'> = {
  true: 'learn.arrows.hide',
  false: 'learn.arrows.reveal',
};

const ARROW_ACTION_BY_VISIBILITY: ValueByFlag<() => void> = {
  true: learnTreeMachine.hideArrows,
  false: learnTreeMachine.revealArrows,
};

// @FollowsBlueprint molecule-presentational
export function LearnDrillActions({ areArrowsRevealed }: LearnDrillActionsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Button label={t('learn.reset')} onActivate={learnTreeMachine.reset} />
      <Button
        label={t(ARROW_LABEL_KEY_BY_VISIBILITY[`${areArrowsRevealed}`])}
        onActivate={ARROW_ACTION_BY_VISIBILITY[`${areArrowsRevealed}`]}
      />
    </>
  );
}
