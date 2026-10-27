/** @Feature sessions */

import {
  CONCERT_CAPACITY_MAX,
  CONCERT_GEAR_MAX_LENGTH,
  CONCERT_VENUE_MAX_LENGTH,
} from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import { type JSX, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '../../lib/api.client';
import { useCreateSession } from '../../lib/queries/sessions.queries';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Input } from '../atoms/Input';
import { inputVariants } from '../atoms/input.variants';
import { Sheet } from '../molecules/Sheet';
import {
  dateTimeLocalToIso,
  type ExistingConcert,
  filterFutureConcerts,
  selectInitialDateTimeLocal,
} from './create-session-dialog.utils';

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft';

interface CreateSessionDialogProps {
  readonly kind: 'concert' | 'practice';
  readonly onClose: () => void;
  readonly onCreated: (sessionId: string) => void;
  readonly existingConcerts?: readonly ExistingConcert[];
  readonly initialDate?: Date;
  readonly origin?: 'free_slot' | null;
}

const TITLE_KEY_BY_KIND = {
  concert: 'sessions.create.concertTitle',
  practice: 'sessions.create.practiceTitle',
} as const;

const concertFormSchema = z.object({
  dateLocal: z.string().min(1),
  venue: z.string().trim().min(1).max(CONCERT_VENUE_MAX_LENGTH),
  capacity: z.string().regex(/^\d*$/u),
  gear: z.string().max(CONCERT_GEAR_MAX_LENGTH),
});

const practiceFormSchema = z.object({
  dateLocal: z.string().min(1),
  preparedConcertId: z.string().uuid().nullable(),
});

// @FollowsBlueprint organism-form
export function CreateSessionDialog({
  kind,
  onClose,
  onCreated,
  existingConcerts = [],
  initialDate,
  origin = null,
}: CreateSessionDialogProps): JSX.Element {
  const { t } = useTranslation();
  const createSession = useCreateSession();

  const initialDateLocal = useMemo(
    () => selectInitialDateTimeLocal(initialDate, new Date()),
    [initialDate],
  );
  const futureConcerts = useMemo(
    () => filterFutureConcerts(existingConcerts, new Date()),
    [existingConcerts],
  );

  const concertForm = useForm({
    defaultValues: { dateLocal: initialDateLocal, venue: '', capacity: '0', gear: '' },
    validators: { onChange: concertFormSchema },
    onSubmit: async ({ value }) => {
      const iso = dateTimeLocalToIso(value.dateLocal);
      if (iso === null) return;
      const created = await createSession.mutateAsync({
        kind: 'concert',
        date: iso,
        venue: value.venue.trim(),
        capacity:
          value.capacity === '' ? 0 : Math.min(CONCERT_CAPACITY_MAX, Number(value.capacity)),
        gear: value.gear,
        friendsCountPerMember: {},
      });
      onCreated(created.session.id);
      onClose();
    },
  });

  const practiceDefaults: { dateLocal: string; preparedConcertId: string | null } = {
    dateLocal: initialDateLocal,
    preparedConcertId: null,
  };
  const practiceForm = useForm({
    defaultValues: practiceDefaults,
    validators: { onChange: practiceFormSchema },
    onSubmit: async ({ value }) => {
      const iso = dateTimeLocalToIso(value.dateLocal);
      if (iso === null) return;
      const created = await createSession.mutateAsync({
        kind: 'practice',
        date: iso,
        preparedConcertId: value.preparedConcertId,
        origin,
      });
      onCreated(created.session.id);
      onClose();
    },
  });

  const submitError = createSession.error instanceof ApiError ? createSession.error.message : null;

  const formByKind: Readonly<Record<CreateSessionDialogProps['kind'], JSX.Element>> = {
    concert: (
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void concertForm.handleSubmit();
        }}
      >
        <label className={LABEL_CLASS} htmlFor="create-session-date-concert">
          {t('sessions.create.date')}
        </label>
        <concertForm.Field name="dateLocal">
          {(field) => (
            <Input
              id="create-session-date-concert"
              type="datetime-local"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
            />
          )}
        </concertForm.Field>
        <label className={LABEL_CLASS} htmlFor="create-session-venue">
          {t('sessions.venue')}
        </label>
        <concertForm.Field name="venue">
          {(field) => (
            <Input
              id="create-session-venue"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={CONCERT_VENUE_MAX_LENGTH}
              required
            />
          )}
        </concertForm.Field>
        <label className={LABEL_CLASS} htmlFor="create-session-capacity">
          {t('sessions.capacity')}
        </label>
        <concertForm.Field name="capacity">
          {(field) => (
            <Input
              id="create-session-capacity"
              type="number"
              min={0}
              max={CONCERT_CAPACITY_MAX}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </concertForm.Field>
        <label className={LABEL_CLASS} htmlFor="create-session-gear">
          {t('sessions.gear')}
        </label>
        <concertForm.Field name="gear">
          {(field) => (
            <textarea
              id="create-session-gear"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              className={composeClassName(inputVariants({ size: 'md' }), 'resize-y')}
              rows={3}
              maxLength={CONCERT_GEAR_MAX_LENGTH}
            />
          )}
        </concertForm.Field>
        {submitError === null ? null : (
          <p className="text-meta text-danger" role="alert">
            {submitError}
          </p>
        )}
        <div className="flex gap-2 mt-2 justify-end">
          <concertForm.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="primary"
                icon="plus"
                disabled={!canSubmit || isSubmitting || createSession.isPending}
              >
                {createSession.isPending || isSubmitting
                  ? t('common.loading')
                  : t('sessions.create.submit')}
              </Button>
            )}
          </concertForm.Subscribe>
        </div>
      </form>
    ),
    practice: (
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void practiceForm.handleSubmit();
        }}
      >
        <label className={LABEL_CLASS} htmlFor="create-session-date-practice">
          {t('sessions.create.date')}
        </label>
        <practiceForm.Field name="dateLocal">
          {(field) => (
            <Input
              id="create-session-date-practice"
              type="datetime-local"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
            />
          )}
        </practiceForm.Field>
        <label className={LABEL_CLASS} htmlFor="create-session-prepared">
          {t('sessions.preparedConcert')}
        </label>
        <practiceForm.Field name="preparedConcertId">
          {(field) => (
            <select
              id="create-session-prepared"
              value={field.state.value ?? ''}
              onChange={(event) =>
                field.handleChange(event.target.value === '' ? null : event.target.value)
              }
              onBlur={field.handleBlur}
              className={inputVariants({ size: 'md' })}
            >
              <option value="">{t('sessions.noPreparedConcert')}</option>
              {futureConcerts.map((concert) => (
                <option key={concert.id} value={concert.id}>
                  {concert.venue ?? '—'} — {new Date(concert.date).toLocaleString()}
                </option>
              ))}
            </select>
          )}
        </practiceForm.Field>
        {submitError === null ? null : (
          <p className="text-meta text-danger" role="alert">
            {submitError}
          </p>
        )}
        <div className="flex gap-2 mt-2 justify-end">
          <practiceForm.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="primary"
                icon="plus"
                disabled={!canSubmit || isSubmitting || createSession.isPending}
              >
                {createSession.isPending || isSubmitting
                  ? t('common.loading')
                  : t('sessions.create.submit')}
              </Button>
            )}
          </practiceForm.Subscribe>
        </div>
      </form>
    ),
  };

  return (
    <Sheet
      title={t(TITLE_KEY_BY_KIND[kind])}
      label={t(TITLE_KEY_BY_KIND[kind])}
      isDismissible={false}
      onClose={onClose}
    >
      {formByKind[kind]}
    </Sheet>
  );
}
