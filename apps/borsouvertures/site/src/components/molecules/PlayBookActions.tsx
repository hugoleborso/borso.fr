import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { playMachine } from '@/openings/machineInstances';
import type { PlayActionsProps } from './drill-actions.types';

// @FollowsBlueprint molecule-presentational
export function PlayBookActions({ isUndoAllowed }: PlayActionsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Button label={t('play.reset')} onActivate={playMachine.reset} />
      <Button label={t('play.undo')} isDisabled={!isUndoAllowed} onActivate={playMachine.undo} />
    </>
  );
}
