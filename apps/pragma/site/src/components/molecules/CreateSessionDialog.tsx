/**
 * Modal that asks the operator for the fields the back-end requires
 * before a session can be created — date is mandatory (Zod
 * `z.string().datetime()` on both branches of `sessionCreateSchema`),
 * concerts additionally need a non-empty venue. The molecule owns its
 * own form state via `useForm`; the parent supplies the kind, open
 * state, and the `onCreated` callback that fires once the mutation
 * resolves.
 */

import { useForm } from '@tanstack/react-form';
import { type JSX, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '../../lib/api';
import { useCreateSession } from '../../lib/queries/sessions';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import {
  dateTimeLocalToIso,
  defaultDateTimeLocal,
  filterFutureConcerts,
} from './create-session-dialog.utils';

const VENUE_MAX = 256;
const GEAR_MAX = 2_048;
const CAPACITY_MAX = 100_000;
const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

interface ExistingConcert {
  readonly id: string;
  readonly date: string;
  readonly venue: string | null;
}

interface CreateSessionDialogProps {
  readonly kind: 'concert' | 'practice';
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: (sessionId: string) => void;
  readonly existingConcerts?: readonly ExistingConcert[];
}

const concertFormSchema = z.object({
  dateLocal: z.string().min(1),
  venue: z.string().trim().min(1).max(VENUE_MAX),
  capacity: z.string().regex(/^\d*$/u),
  gear: z.string().max(GEAR_MAX),
});

const practiceFormSchema = z.object({
  dateLocal: z.string().min(1),
  preparedConcertId: z.string().uuid().nullable(),
});

export function CreateSessionDialog({
  kind,
  open,
  onClose,
  onCreated,
  existingConcerts = [],
}: CreateSessionDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createSession = useCreateSession();

  const initialDateLocal = useMemo(() => defaultDateTimeLocal(new Date()), []);
  const futureConcerts = useMemo(
    () => filterFutureConcerts(existingConcerts, new Date()),
    [existingConcerts],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

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
        capacity: value.capacity === '' ? 0 : Math.min(CAPACITY_MAX, Number(value.capacity)),
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
      });
      onCreated(created.session.id);
      onClose();
    },
  });

  const submitError = createSession.error instanceof ApiError ? createSession.error.message : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[28rem] max-w-[28rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display italic text-xl text-ink-900 m-0">
          {t(kind === 'concert' ? 'sessions.create.concertTitle' : 'sessions.create.practiceTitle')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('common.cancel')}
        >
          ×
        </Button>
      </div>
      {kind === 'concert' ? (
        <form
          className="flex flex-col gap-2.5 p-4"
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
                maxLength={VENUE_MAX}
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
                max={CAPACITY_MAX}
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
                className="w-full bg-bg-elev border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
                rows={3}
                maxLength={GEAR_MAX}
              />
            )}
          </concertForm.Field>
          {submitError !== null ? (
            <p className="text-danger text-sm" role="alert">
              {submitError}
            </p>
          ) : null}
          <div className="flex gap-2 mt-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <concertForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="accent"
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
      ) : (
        <form
          className="flex flex-col gap-2.5 p-4"
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
                className="w-full rounded-md bg-bg-elev border border-line text-ink-900 outline-none focus:border-ink-700 px-3 py-2 text-[13px]"
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
          {submitError !== null ? (
            <p className="text-danger text-sm" role="alert">
              {submitError}
            </p>
          ) : null}
          <div className="flex gap-2 mt-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <practiceForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="accent"
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
      )}
    </dialog>
  );
}
