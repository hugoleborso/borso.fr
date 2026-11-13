import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { playMachine } from '@/openings/machineInstances';

// @FollowsBlueprint molecule-presentational
export function PlayCompletedActions() {
  const { t } = useTranslation();
  return (
    <>
      <Button label={t('play.completed.dismiss')} onActivate={playMachine.dismissSuccess} />
      <Button
        label={t('play.completed.play-again')}
        variant="primary"
        onActivate={playMachine.reset}
      />
    </>
  );
}
