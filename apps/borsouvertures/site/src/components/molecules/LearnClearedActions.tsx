import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { learnTreeMachine } from '@/openings/machineInstances';
import { startPlayWithVariation } from '@/state/appState';
import type { LearnDrillActionsProps } from './drill-actions.types';

// @FollowsBlueprint molecule-presentational
export function LearnClearedActions({ openingId, variationId }: LearnDrillActionsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Button label={t('learn.cleared.drill-again')} onActivate={learnTreeMachine.reset} />
      <Button
        label={t('learn.cleared.play-scope')}
        variant="primary"
        onActivate={() => startPlayWithVariation(openingId, variationId)}
      />
    </>
  );
}
