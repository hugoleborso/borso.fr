/** @Feature takes */

import { TAKE_COMMENT_MAX_LENGTH } from '@domain/take-upload.core';
import { useForm } from '@tanstack/react-form';
import { type JSX, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  type ListedTake,
  useCreateTakeComment,
  useDeleteTake,
  useDeleteTakeComment,
  useTakeComments,
  useTakePlaybackUrl,
} from '../../lib/queries/takes.queries';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { formatDuration } from '../molecules/song-duration.utils';
import { placeMomentMarks, isMomentToggleOn, selectCommentMoment } from './take-player.core';

export interface TakePlayerProps {
  readonly take: ListedTake;
  readonly onClose: () => void;
}

const NO_COMMENTS: readonly never[] = [];

const commentFormSchema = z.object({
  body: z.string().trim().min(1).max(TAKE_COMMENT_MAX_LENGTH),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

const EMPTY_COMMENT: CommentFormValues = { body: '' };

interface MomentButtonProps {
  readonly atSeconds: number;
  readonly onSeek: (atSeconds: number) => void;
}

function MomentButton({ atSeconds, onSeek }: MomentButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="font-mono text-xs text-accent min-h-11 px-1 bg-transparent border-0 cursor-pointer"
      onClick={() => onSeek(atSeconds)}
    >
      {formatDuration(atSeconds)}
    </button>
  );
}

// @FollowsBlueprint organism-query-owning
export function TakePlayer({ take, onClose }: TakePlayerProps): JSX.Element {
  const { t } = useTranslation();
  const playbackQuery = useTakePlaybackUrl(take.objectKey);
  const commentsQuery = useTakeComments(take.id);
  const createComment = useCreateTakeComment();
  const deleteComment = useDeleteTakeComment();
  const deleteTake = useDeleteTake();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [momentChoice, setMomentChoice] = useState<boolean | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const comments = commentsQuery.data?.comments ?? NO_COMMENTS;
  const marks = useMemo(
    () => placeMomentMarks(comments, take.durationSeconds),
    [comments, take.durationSeconds],
  );
  const isMomentOn = isMomentToggleOn(momentChoice, isPaused, currentSeconds);
  const moment = selectCommentMoment(isMomentOn, currentSeconds, take.durationSeconds);

  const form = useForm({
    defaultValues: EMPTY_COMMENT,
    validators: { onChange: commentFormSchema, onSubmit: commentFormSchema },
    onSubmit: async ({ value, formApi }) => {
      await createComment.mutateAsync({
        takeId: take.id,
        songId: take.songId,
        body: value.body.trim(),
        atSeconds: moment,
      });
      formApi.reset();
      setMomentChoice(null);
    },
  });

  const seek = (atSeconds: number): void => {
    const player = audio.current;
    if (player === null) return;
    player.currentTime = atSeconds;
    setCurrentSeconds(atSeconds);
  };

  const confirmDelete = (): void => {
    setIsConfirmingDelete(false);
    deleteTake.mutate({ takeId: take.id, songId: take.songId });
    onClose();
  };

  return (
    <section
      aria-label={t('takes.player.title')}
      className="flex flex-col gap-3 rounded-md border border-line bg-bg p-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-wider uppercase text-ink-400 font-medium flex-1">
          {t('takes.player.title')}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setIsConfirmingDelete(true)}>
          <Icon name="trash" size={12} />
          {t('takes.player.delete')}
        </Button>
        <Button variant="ghost" size="sm" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" size={12} />
        </Button>
      </div>

      {playbackQuery.data === undefined ? (
        <p
          className="text-sm text-ink-400 italic m-0"
          role={playbackQuery.isError ? 'alert' : 'status'}
        >
          {t(playbackQuery.isError ? 'takes.player.loadFailed' : 'common.loading')}
        </p>
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- a rehearsal recording has no transcript to caption; the thread below is its only text
        <audio
          ref={audio}
          controls
          preload="metadata"
          src={playbackQuery.data.getUrl}
          className="w-full"
          onTimeUpdate={(event) => setCurrentSeconds(event.currentTarget.currentTime)}
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
        />
      )}

      <div className="relative h-6 rounded bg-bg-sunk" aria-label={t('takes.player.marks')}>
        {marks.map((mark) => (
          <button
            key={mark.id}
            type="button"
            className="absolute top-0 h-6 w-3 -ml-1.5 rounded-sm bg-accent cursor-pointer border-0"
            style={{ left: `${mark.offsetPercent}%` }}
            aria-label={t('takes.player.markAria', { moment: formatDuration(mark.atSeconds) })}
            onClick={() => seek(mark.atSeconds)}
          />
        ))}
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-ink-400 italic m-0">{t('takes.player.noComments')}</p>
      ) : (
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {comments.map((comment) => {
            return (
              <li key={comment.id} className="flex items-start gap-2 text-sm">
                {comment.atSeconds === null ? null : (
                  <MomentButton atSeconds={comment.atSeconds} onSeek={seek} />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-ink-500 mr-2">
                    {comment.authorName ?? t('takes.formerMember')}
                  </span>
                  <span className="text-ink-900 whitespace-pre-wrap break-words">
                    {comment.body}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('takes.player.deleteComment')}
                  onClick={() =>
                    deleteComment.mutate({
                      takeId: take.id,
                      songId: take.songId,
                      commentId: comment.id,
                    })
                  }
                >
                  <Icon name="trash" size={12} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field name="body">
          {(field) => (
            <AutoGrowTextarea
              aria-label={t('takes.player.commentPlaceholder')}
              placeholder={t('takes.player.commentPlaceholder')}
              value={field.state.value}
              maxLength={TAKE_COMMENT_MAX_LENGTH}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-ink-700 min-h-11">
            <input
              type="checkbox"
              checked={isMomentOn}
              disabled={currentSeconds <= 0}
              onChange={(event) => setMomentChoice(event.target.checked)}
            />
            {t('takes.player.momentToggle', {
              moment: formatDuration(Math.floor(currentSeconds)),
            })}
          </label>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                {t('takes.player.send')}
              </Button>
            )}
          </form.Subscribe>
        </div>
        {createComment.isError ? (
          <p className="text-sm text-danger m-0" role="alert">
            {t('takes.player.commentFailed')}
          </p>
        ) : null}
      </form>

      {isConfirmingDelete ? (
        <ConfirmDialog
          question={t('takes.player.deleteConfirm')}
          confirmLabel={t('takes.player.delete')}
          onConfirm={confirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      ) : null}
    </section>
  );
}
