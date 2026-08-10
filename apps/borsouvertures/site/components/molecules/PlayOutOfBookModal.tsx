import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Modal } from '@/components/atoms/Modal';
import { playMachine } from '@/openings/machineInstances';

// @FollowsBlueprint molecule-presentational
export function PlayOutOfBookModal() {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('play.out-of-book.title')}
      closeLabel={t('common.action.close')}
      onClose={playMachine.dismissOutOfBook}
    >
      <div className="controls-row modal-actions between">
        <Button label={t('play.out-of-book.try-again')} onActivate={playMachine.dismissOutOfBook} />
        <Button
          label={t('play.out-of-book.show-moves')}
          variant="primary"
          onActivate={playMachine.revealBookMoves}
        />
      </div>
    </Modal>
  );
}
