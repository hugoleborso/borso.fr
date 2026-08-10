import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Modal } from '@/components/atoms/Modal';
import { learnTreeMachine } from '@/openings/machineInstances';

function revealBookMovesAndClose(): void {
  learnTreeMachine.revealArrows();
  learnTreeMachine.dismissOutOfBook();
}

// @FollowsBlueprint molecule-presentational
export function LearnOutOfBookModal() {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('learn.out-of-book.title')}
      closeLabel={t('common.action.close')}
      onClose={learnTreeMachine.dismissOutOfBook}
    >
      <p>{t('learn.out-of-book.message')}</p>
      <div className="controls-row modal-actions">
        <Button
          label={t('learn.out-of-book.try-again')}
          onActivate={learnTreeMachine.dismissOutOfBook}
        />
        <Button
          label={t('learn.out-of-book.reveal')}
          variant="primary"
          onActivate={revealBookMovesAndClose}
        />
      </div>
    </Modal>
  );
}
