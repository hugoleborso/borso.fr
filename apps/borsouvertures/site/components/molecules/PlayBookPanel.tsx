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
    <div className="p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      <h2 className="my-[1.17rem] text-[1.17rem] font-bold">{t('play.title')}</h2>
      <p className="my-4">{t('play.description')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button label={t('play.reset')} onActivate={playMachine.reset} />
        <Button label={t('play.undo')} isDisabled={!isUndoAllowed} onActivate={playMachine.undo} />
      </div>
    </div>
  );
}
