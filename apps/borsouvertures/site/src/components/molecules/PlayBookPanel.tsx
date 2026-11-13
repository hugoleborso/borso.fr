import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { playMachine } from '@/openings/machineInstances';

interface PlayBookPanelProps {
  isUndoAllowed: boolean;
}

// @FollowsBlueprint molecule-presentational
export function PlayBookPanel({ isUndoAllowed }: PlayBookPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="pt-3 border-t-[3px] border-ink">
      <h2 className="mb-3 text-xl font-bold">{t('play.title')}</h2>
      <p className="my-4">{t('play.description')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button label={t('play.reset')} onActivate={playMachine.reset} />
        <Button label={t('play.undo')} isDisabled={!isUndoAllowed} onActivate={playMachine.undo} />
      </div>
    </div>
  );
}
