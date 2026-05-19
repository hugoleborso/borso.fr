/**
 * Modal that reads + writes a transition comment for the ordered pair
 * (songA → songB). Used by `SetlistEditor` when the user clicks on a
 * flagged transition warning between two consecutive setlist entries.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';

const commentSchema = z.object({
  songAId: z.string().uuid(),
  songBId: z.string().uuid(),
  comment: z.string(),
  updatedAt: z.string(),
});
const singleCommentSchema = z.object({ comment: commentSchema });

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
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect synchronises with the server (external system): on mount,
  // fetch the existing comment if any; the cleanup flag handles the
  // race when the modal is unmounted before the fetch resolves.
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const body = singleCommentSchema.parse(
          await apiRequest(`/api/transition-comments/${songAId}/${songBId}`),
        );
        if (!cancelled) setDraft(body.comment.comment);
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 404) setDraft('');
        else setError(caught instanceof ApiError ? caught.message : 'unknown-error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [songAId, songBId]);

  const save = async (): Promise<void> => {
    try {
      await apiRequest(`/api/transition-comments/${songAId}/${songBId}`, {
        method: 'PUT',
        body: { comment: draft },
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3>{t('setlist.transitionCommentTitle')}</h3>
        {error !== null ? <p className="admin-page-error">{error}</p> : null}
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            maxLength={COMMENT_MAX_LENGTH}
          />
        )}
        <div className="modal-actions">
          <button type="button" className="admin-page-form-submit" onClick={() => void save()}>
            {t('common.save')}
          </button>
          <button type="button" className="admin-page-form-cancel" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
