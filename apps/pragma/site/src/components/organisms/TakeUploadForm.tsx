/** @Feature takes */

import { useForm } from '@tanstack/react-form';
import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import { openDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import {
  readAudioDurationMilliseconds,
  readBrowserAudioDurationEnvironment,
} from '../../lib/recorder.adapter';
import { roundDurationSeconds, type TakeNotSavedReason } from '../../lib/take-queue.core';
import { queueTake } from '../../lib/take-queue.setup';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { inputVariants } from '../atoms/input.variants';
import {
  parseDateTimeLocalValue,
  readSessionChoice,
  selectNearestPractice,
  selectPracticeOptions,
  selectQueueFailure,
  selectTakeFileMessage,
  type TakeUploadFormValues,
  takeUploadFormSchema,
  toDateTimeLocalValue,
} from './take-upload-form.core';

export interface TakeUploadFormProps {
  readonly songId: string;
  readonly songTitle: string;
  readonly presetSessionId: string | null;
  readonly onClose: () => void;
}

const FIELD_LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
const SELECT_CLASS = inputVariants({ size: 'md' });
const AUDIO_ACCEPT = 'audio/*';
const NO_SESSIONS: readonly never[] = [];

const QUEUE_FAILURE_KEY = {
  'quota-exceeded': 'takes.recording.quotaExceeded',
  failed: 'takes.recording.queueFailed',
  unplayable: 'takes.recording.unplayable',
} as const satisfies Record<TakeNotSavedReason, string>;

// @FollowsBlueprint route-form
export function TakeUploadForm({
  songId,
  songTitle,
  presetSessionId,
  onClose,
}: TakeUploadFormProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const sessionsQuery = useSessionsList();
  const sessions = sessionsQuery.data?.sessions ?? NO_SESSIONS;
  const practices = useMemo(() => selectPracticeOptions(sessions), [sessions]);
  const [queueFailure, setQueueFailure] = useState<TakeNotSavedReason | null>(null);

  const defaultValues: TakeUploadFormValues = {
    file: null,
    recordedAt: toDateTimeLocalValue(new Date()),
    sessionId: presetSessionId ?? '',
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: takeUploadFormSchema, onSubmit: takeUploadFormSchema },
    onSubmit: async ({ value }) => {
      const recordedAt = parseDateTimeLocalValue(value.recordedAt);
      if (value.file === null || recordedAt === null) return;
      const durationMilliseconds = await readAudioDurationMilliseconds(
        value.file,
        readBrowserAudioDurationEnvironment(),
      );
      const outcome = await queueTake(
        {
          songId,
          sessionId: readSessionChoice(value.sessionId),
          recordedAt,
          durationSeconds: roundDurationSeconds(durationMilliseconds),
          rawContentType: value.file.type,
          source: 'upload',
        },
        value.file,
      );
      const failure = selectQueueFailure(outcome);
      setQueueFailure(failure);
      if (failure === null) onClose();
    },
  });

  const chooseFile = (file: File): void => {
    const fileDate = new Date(file.lastModified);
    form.setFieldValue('file', file);
    form.setFieldValue('recordedAt', toDateTimeLocalValue(fileDate));
    if (presetSessionId === null) {
      form.setFieldValue('sessionId', selectNearestPractice(sessions, fileDate) ?? '');
    }
  };

  return (
    <dialog
      ref={openDialogOnAttach}
      onClose={onClose}
      aria-label={t('takes.uploadForm.title', { title: songTitle })}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[28rem] max-w-[28rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <form
        className="p-4 flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-1">
          {t('takes.uploadForm.title', { title: songTitle })}
        </h3>
        <label className={FIELD_LABEL_CLASS} htmlFor="take-upload-file">
          {t('takes.uploadForm.file')}
        </label>
        <form.Field name="file">
          {(field) => {
            const message = selectTakeFileMessage(field.state.value);
            return (
              <>
                <input
                  id="take-upload-file"
                  type="file"
                  accept={AUDIO_ACCEPT}
                  className="text-sm text-ink-700 min-h-11"
                  onChange={(event) => {
                    const picked = event.target.files?.[0];
                    if (picked !== undefined) chooseFile(picked);
                  }}
                />
                {message === null ? null : (
                  <p className="text-sm text-danger m-0" role="alert">
                    {t(message.key, message)}
                  </p>
                )}
              </>
            );
          }}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="take-upload-recorded-at">
          {t('takes.uploadForm.recordedAt')}
        </label>
        <form.Field name="recordedAt">
          {(field) => (
            <Input
              id="take-upload-recorded-at"
              type="datetime-local"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="take-upload-session">
          {t('takes.uploadForm.session')}
        </label>
        <form.Field name="sessionId">
          {(field) => (
            <select
              id="take-upload-session"
              className={SELECT_CLASS}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            >
              <option value="">{t('takes.uploadForm.noSession')}</option>
              {practices.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  {formatSessionDate(practice.date, i18n.language)}
                </option>
              ))}
            </select>
          )}
        </form.Field>
        {queueFailure === null ? null : (
          <p className="text-sm text-danger m-0" role="alert">
            {t(QUEUE_FAILURE_KEY[queueFailure])}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <form.Subscribe
            selector={(state) =>
              [state.canSubmit, state.isSubmitting, state.values.file === null] as const
            }
          >
            {([canSubmit, isSubmitting, hasNoFile]) => (
              <Button
                type="submit"
                variant="accent"
                disabled={!canSubmit || isSubmitting || hasNoFile}
              >
                {t('common.save')}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </dialog>
  );
}
