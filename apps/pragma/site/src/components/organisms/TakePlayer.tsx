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
import { IconButton } from '../atoms/IconButton';
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
    <Button
      icon="play"
      variant="quiet"
      className="min-w-11 font-mono"
      onClick={() => onSeek(atSeconds)}
    >
      {formatDuration(atSeconds)}
    </Button>
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
      className="flex flex-col gap-3 rounded-md border border-rule bg-paper p-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-label tracking-wider uppercase text-ink-soft font-medium flex-1">
          {t('takes.player.title')}
        </span>
        <Button variant="quiet" icon="trash" onClick={() => setIsConfirmingDelete(true)}>
          {t('takes.player.delete')}
        </Button>
        <IconButton icon="close" label={t('common.close')} onClick={onClose} />
      </div>

      {playbackQuery.data === undefined ? (
        <p
          className="text-meta text-ink-soft italic m-0"
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

      <div className="relative h-11" role="group" aria-label={t('takes.player.marks')}>
        <div aria-hidden="true" className="absolute inset-x-0 top-2.5 h-6 rounded-sm bg-sunk">
          {marks.map((mark) => (
            <span
              key={mark.id}
              className="absolute top-0 h-6 w-3 -ml-1.5 rounded-sm bg-accent"
              style={{ left: `${mark.offsetPercent}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-y-0 -inset-x-5.5 overflow-hidden pointer-events-none">
          <div className="absolute inset-y-0 inset-x-5.5">
            {marks.map((mark) => (
              <div
                key={mark.id}
                className="absolute inset-y-0 overflow-hidden"
                style={{
                  left: `${mark.reachStartPercent}%`,
                  width: `${mark.reachEndPercent - mark.reachStartPercent}%`,
                }}
              >
                {/* eslint-disable-next-line borso/no-raw-interactive-element -- an invisible tap area laid over the waveform at the comment's moment; the waveform draws the mark, and a Button's icon and fill would hide it */}
                <button
                  type="button"
                  className="absolute top-0 h-11 w-11 -ml-5.5 p-0 bg-transparent border-0 cursor-pointer pointer-events-auto"
                  style={{ left: `${mark.offsetInReachPercent}%` }}
                  aria-label={t('takes.player.markAria', {
                    moment: formatDuration(mark.atSeconds),
                  })}
                  onClick={() => seek(mark.atSeconds)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="text-meta text-ink-soft italic m-0">{t('takes.player.noComments')}</p>
      ) : (
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {comments.map((comment) => {
            return (
              <li key={comment.id} className="flex items-start gap-2 text-meta">
                {comment.atSeconds === null ? null : (
                  <MomentButton atSeconds={comment.atSeconds} onSeek={seek} />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-meta text-ink-soft mr-2">
                    {comment.authorName ?? t('takes.formerMember')}
                  </span>
                  <span className="text-ink whitespace-pre-wrap break-words">{comment.body}</span>
                </div>
                <IconButton
                  icon="trash"
                  variant="danger"
                  label={t('takes.player.deleteComment')}
                  onClick={() =>
                    deleteComment.mutate({
                      takeId: take.id,
                      songId: take.songId,
                      commentId: comment.id,
                    })
                  }
                />
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
          <label className="inline-flex items-center gap-2 text-meta text-ink min-h-11">
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
              <Button
                icon="check"
                type="submit"
                variant="primary"
                disabled={!canSubmit || isSubmitting}
              >
                {t('takes.player.send')}
              </Button>
            )}
          </form.Subscribe>
        </div>
        {createComment.isError ? (
          <p className="text-meta text-danger m-0" role="alert">
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
