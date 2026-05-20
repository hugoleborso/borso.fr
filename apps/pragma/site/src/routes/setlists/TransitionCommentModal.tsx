/**
 * Modal that reads + writes a transition comment for the ordered pair
 * (songA → songB). Used by `SetlistEditor` when the user clicks on a
 * flagged transition warning between two consecutive setlist entries.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
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
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-bg-elev border border-line-strong rounded-lg p-6 w-full max-w-[480px] shadow-[0_18px_50px_rgba(26,22,18,0.18)]">
        <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-4">
          {t('setlist.transitionCommentTitle')}
        </h3>
        {error !== null ? (
          <p className="text-danger text-sm mb-3" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
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
          <Button type="button" variant="accent" onClick={() => void save()}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
