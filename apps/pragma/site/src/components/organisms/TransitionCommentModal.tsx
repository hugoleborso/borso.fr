/**
 * Modal that reads + writes a transition comment for the ordered pair
 * (songA → songB). Used by `SetlistEditor` when the user clicks on a
 * flagged transition warning between two consecutive setlist entries.
 *
 * The textarea shows the stored comment until the operator types, and
 * the typed value from then on, so the loaded comment is derived during
 * render rather than copied into state by an effect.
 *
 * It is a native modal `<dialog>` like every other sheet in the app, so
 * Escape and the backdrop both dismiss it. As a plain fixed `div` it answered
 * to neither, and Cancel was the only way out.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';
import { ApiError } from '../../lib/api';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog';
import { useSaveTransitionComment, useTransitionComment } from '../../lib/queries/transitions';

const COMMENT_MAX_LENGTH = 4_096;

export interface TransitionCommentModalProps {
  readonly songAId: string;
  readonly songBId: string;
  readonly songATitle: string;
  readonly songBTitle: string;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-query-owning
export function TransitionCommentModal({
  songAId,
  songBId,
  songATitle,
  songBTitle,
  onClose,
}: TransitionCommentModalProps): JSX.Element {
  const { t } = useTranslation();
  const existing = useTransitionComment(songAId, songBId);
  const save = useSaveTransitionComment();
  const [editedDraft, setEditedDraft] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const draft = editedDraft ?? existing.data?.comment.comment ?? '';

  const saveComment = (): void => {
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
    <dialog
      ref={openDismissibleDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[30rem] max-w-[30rem] rounded-lg border border-line-strong bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="p-6">
        <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-1">
          {t('setlist.transitionCommentTitle')}
        </h3>
        <p className="text-xs text-ink-500 m-0 mb-4">
          {songATitle} <span className="text-ink-300">▸</span> {songBTitle}
        </p>
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
            onChange={(event) => setEditedDraft(event.target.value)}
            rows={6}
            maxLength={COMMENT_MAX_LENGTH}
            className={composeClassName(inputVariants({ size: 'md' }), 'font-mono resize-y')}
          />
        )}
        <div className="flex gap-2 mt-4 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="accent" onClick={saveComment} disabled={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
