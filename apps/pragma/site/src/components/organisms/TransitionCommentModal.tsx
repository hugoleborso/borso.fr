/** @Feature transitions */

import { TRANSITION_COMMENT_MAX_LENGTH } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Sheet } from '../molecules/Sheet';
import { ApiError } from '../../lib/api.client';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { useTransitionDraft } from '../../lib/transition-draft.store';
import {
  useSaveTransitionComment,
  useTransitionComment,
} from '../../lib/queries/transitions.queries';

const TRANSITION_NOTE_ROWS = 3;

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
  const kept = useTransitionDraft(songAId, songBId);
  const [localError, setLocalError] = useState<string | null>(null);

  const draft = kept.text ?? existing.data?.comment.comment ?? '';

  const saveComment = (): void => {
    save.mutate(
      { a: songAId, b: songBId, comment: draft },
      {
        onSuccess: () => {
          recordProductEvent('transition_comment_saved');
          kept.discard();
          onClose();
        },
        onError: (error) =>
          setLocalError(error instanceof ApiError ? error.message : 'unknown-error'),
      },
    );
  };

  const queryError = existing.error instanceof ApiError ? existing.error.message : null;
  const displayError = localError ?? queryError;

  return (
    <Sheet
      title={t('setlist.transitionCommentTitle')}
      label={t('setlist.transitionCommentTitle')}
      onClose={onClose}
      footer={
        <Button icon="check" variant="primary" onClick={saveComment} disabled={save.isPending}>
          {t('common.save')}
        </Button>
      }
    >
      <div>
        <p className="m-0 mb-4 text-meta text-ink-soft">
          {songATitle} <span className="text-ink-faint">▸</span> {songBTitle}
        </p>
        {displayError === null ? null : (
          <p className="text-danger text-meta mb-3" role="alert">
            {displayError}
          </p>
        )}
        {existing.isLoading ? (
          <p className="m-0 mb-2 text-meta text-ink-soft">{t('common.loading')}</p>
        ) : null}
        <AutoGrowTextarea
          size="md"
          value={draft}
          onChange={(event) => kept.keep(event.target.value)}
          readOnly={existing.isLoading}
          aria-label={t('setlist.transitionCommentTitle')}
          rows={TRANSITION_NOTE_ROWS}
          maxLength={TRANSITION_COMMENT_MAX_LENGTH}
          className="font-display italic"
        />
      </div>
    </Sheet>
  );
}
