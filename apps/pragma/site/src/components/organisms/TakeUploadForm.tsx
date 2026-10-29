/** @Feature takes */

import { useForm } from '@tanstack/react-form';
import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
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
import { Sheet } from '../molecules/Sheet';
import { TAKE_NOT_SAVED_MESSAGE_KEY } from './recording-sheet.core';
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

const FIELD_LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SELECT_CLASS = inputVariants({ size: 'md' });
const AUDIO_ACCEPT = 'audio/*';
const NO_SESSIONS: readonly never[] = [];

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
          isFromPracticeMode: false,
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
    <Sheet
      title={t('takes.uploadForm.title', { title: songTitle })}
      label={t('takes.uploadForm.title', { title: songTitle })}
      isDismissible={false}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe
          selector={(state) =>
            [state.canSubmit, state.isSubmitting, state.values.file !== null] as const
          }
        >
          {([canSubmit, isSubmitting, hasFile]) => (
            <Button
              type="submit"
              variant="primary"
              icon="upload"
              disabled={!canSubmit || isSubmitting || !hasFile}
            >
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-2.5">
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
                  className="text-meta text-ink min-h-11"
                  onChange={(event) => {
                    const picked = event.target.files?.[0];
                    if (picked !== undefined) chooseFile(picked);
                  }}
                />
                {message === null ? null : (
                  <p className="text-meta text-danger m-0" role="alert">
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
          <p className="text-meta text-danger m-0" role="alert">
            {t(TAKE_NOT_SAVED_MESSAGE_KEY[queueFailure])}
          </p>
        )}
      </div>
    </Sheet>
  );
}
