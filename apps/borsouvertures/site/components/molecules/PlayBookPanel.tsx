import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { playMachine } from '@/openings/machineInstances';

interface PlayBookPanelProps {
  isUndoAllowed: boolean;
}

export function PlayBookPanel({ isUndoAllowed }: PlayBookPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="panel">
      <h2>{t('play.title')}</h2>
      <p>{t('play.description')}</p>
      <div className="controls-row">
        <Button label={t('play.reset')} onActivate={playMachine.reset} />
        <Button label={t('play.undo')} isDisabled={!isUndoAllowed} onActivate={playMachine.undo} />
      </div>
    </div>
  );
}
