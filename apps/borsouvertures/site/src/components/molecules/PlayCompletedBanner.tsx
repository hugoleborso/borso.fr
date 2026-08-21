import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/atoms/InlineBanner';
import { playMachine } from '@/openings/machineInstances';
import { selectCompletionMessageKey } from '@/openings/playSession.core';

interface PlayCompletedBannerProps {
  lineLabel: string | undefined;
}

// @FollowsBlueprint molecule-presentational
export function PlayCompletedBanner({ lineLabel }: PlayCompletedBannerProps) {
  const { t } = useTranslation();
  return (
    <InlineBanner
      message={t(selectCompletionMessageKey(lineLabel), { line: lineLabel })}
      primaryLabel={t('play.completed.play-again')}
      onPrimaryClick={playMachine.reset}
      secondaryLabel={t('play.completed.dismiss')}
      onSecondaryClick={playMachine.dismissSuccess}
    />
  );
}
