/**
 * Modal that reads + writes a transition comment for the ordered pair
 * (songA → songB). Used by `SetlistEditor` when the user clicks on a
 * flagged transition warning between two consecutive setlist entries.
 */

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { ApiError } from '../../lib/api';
import { useSaveTransitionComment, useTransitionComment } from '../../lib/queries/transitions';

const COMMENT_MAX_LENGTH = 4_096;

export interface TransitionCommentModalProps {
  readonly songAId: string;
  readonly songBId: string;
  readonly onClose: () => void;
}

export function TransitionCommentModal({
  songAId,
  songBId,
  onClose,
}: TransitionCommentModalProps): JSX.Element {
  const { t } = useTranslation();
  const existing = useTransitionComment(songAId, songBId);
  const save = useSaveTransitionComment();
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (existing.data?.comment !== undefined) {
      setDraft(existing.data.comment.comment);
    } else if (existing.data === null) {
      setDraft('');
    }
  }, [existing.data]);

  const handleSave = (): void => {
    save.mutate(
      { a: songAId, b: songBId, comment: draft },
      {
        onSuccess: onClose,
        onError: (error) =>
          setLocalError(error instanceof ApiError ? error.message : 'unknown-error'),
      },
    );
  };

  const queryError = existing.error instanceof ApiError ? existing.error.message : null;
  const displayError = localError ?? queryError;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-bg-elev border border-line-strong rounded-lg p-6 w-full max-w-[480px] shadow-[0_18px_50px_rgba(26,22,18,0.18)]">
        <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-4">
          {t('setlist.transitionCommentTitle')}
        </h3>
        {displayError === null ? null : (
          <p className="text-danger text-sm mb-3" role="alert">
            {displayError}
          </p>
        )}
        {existing.isLoading ? (
          <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>
        ) : (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            maxLength={COMMENT_MAX_LENGTH}
            className="w-full bg-bg border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
          />
        )}
        <div className="flex gap-2 mt-4 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="accent" onClick={handleSave} disabled={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
