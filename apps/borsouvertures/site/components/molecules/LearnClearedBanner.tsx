import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/atoms/InlineBanner';
import { learnTreeMachine } from '@/openings/machineInstances';
import { startPlayWithVariation } from '@/state/appState';

interface LearnClearedBannerProps {
  openingId: string;
  variationId: string;
}

/** Shown once every line of the drilled variation has been visited. */
// @FollowsBlueprint molecule-presentational
export function LearnClearedBanner({ openingId, variationId }: LearnClearedBannerProps) {
  const { t } = useTranslation();
  return (
    <InlineBanner
      message={t('learn.cleared.message')}
      primaryLabel={t('learn.cleared.play-scope')}
      onPrimaryClick={() => startPlayWithVariation(openingId, variationId)}
      secondaryLabel={t('learn.cleared.drill-again')}
      onSecondaryClick={learnTreeMachine.reset}
    />
  );
}
