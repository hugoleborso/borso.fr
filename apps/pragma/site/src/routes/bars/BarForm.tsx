/**
 * Bar edit / create form. Owns its field state via `useForm` from
 * `@tanstack/react-form`. The parent supplies the initial bar (or the
 * blank form for create) plus a single `onSubmit(payload)` callback;
 * the form keys on `initial.id` so React mounts a fresh instance
 * whenever the parent selects a different row.
 *
 * Field vocabulary, validation, and the values-to-payload translation
 * live in `bar-form.core.ts`.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import {
  BAR_NAME_MAX_LENGTH,
  BAR_NOTES_MAX_LENGTH,
  BAR_STATUS_KEY,
  BAR_STATUSES,
  type BarFormInitial,
  type BarFormSubmitPayload,
  type BarFormTitleKind,
  type BarFormValues,
  barFormValuesSchema,
  buildBarPayloadFromFormValues,
  parseBarStatus,
  selectBarFormTitleKind,
} from './bar-form.core';

interface BarFormProps {
  readonly initial: BarFormInitial;
  readonly onSubmit: (id: string | null, payload: BarFormSubmitPayload) => void;
  readonly onCancel: () => void;
}

const FIELD_LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';
const TEXTAREA_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y';
const SELECT_CLASS =
  'w-full bg-bg-elev border border-line text-ink-900 rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink-700';
const NOTES_ROWS = 4;

interface CancelButtonProps {
  readonly label: string;
  readonly onCancel: () => void;
}

function NoCancelButton(): null {
  return null;
}

function CancelBarFormButton({ label, onCancel }: CancelButtonProps): JSX.Element {
  return (
    <Button type="button" variant="ghost" onClick={onCancel}>
      {label}
    </Button>
  );
}

const CANCEL_BUTTON_BY_TITLE_KIND: Record<
  BarFormTitleKind,
  (props: CancelButtonProps) => JSX.Element | null
> = {
  new: NoCancelButton,
  existing: CancelBarFormButton,
};

export function BarForm({ initial, onSubmit, onCancel }: BarFormProps): JSX.Element {
  const { t } = useTranslation();
  const defaultValues: BarFormValues = {
    name: initial.name,
    status: initial.status,
    notes: initial.notes,
    city: initial.city,
    capacity: initial.capacity,
    contactName: initial.contactName,
    contactEmail: initial.contactEmail,
    contactPhone: initial.contactPhone,
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: barFormValuesSchema },
    onSubmit: ({ value }) => {
      onSubmit(initial.id, buildBarPayloadFromFormValues(value));
    },
  });
  const titleKind = selectBarFormTitleKind(initial);
  const title = { new: t('bars.newBar'), existing: initial.name }[titleKind];
  const CancelButton = CANCEL_BUTTON_BY_TITLE_KIND[titleKind];

  return (
    <Card>
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">{title}</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-2.5"
      >
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-name">
          {t('bars.name')}
        </label>
        <form.Field name="name">
          {(field) => (
            <Input
              id="bar-name"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              maxLength={BAR_NAME_MAX_LENGTH}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-status">
          {t('bars.status')}
        </label>
        <form.Field name="status">
          {(field) => (
            <select
              id="bar-status"
              value={field.state.value}
              onChange={(event) => {
                const status = parseBarStatus(event.target.value);
                if (status === null) throw new TypeError('unknown bar status');
                field.handleChange(status);
              }}
              onBlur={field.handleBlur}
              className={SELECT_CLASS}
            >
              {BAR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(BAR_STATUS_KEY[status])}
                </option>
              ))}
            </select>
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-city">
          {t('bars.city')}
        </label>
        <form.Field name="city">
          {(field) => (
            <Input
              id="bar-city"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-capacity">
          {t('bars.capacity')}
        </label>
        <form.Field name="capacity">
          {(field) => (
            <Input
              id="bar-capacity"
              type="number"
              min={0}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-contact">
          {t('bars.contactName')}
        </label>
        <form.Field name="contactName">
          {(field) => (
            <Input
              id="bar-contact"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-email">
          {t('bars.contactEmail')}
        </label>
        <form.Field name="contactEmail">
          {(field) => (
            <Input
              id="bar-email"
              type="email"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-phone">
          {t('bars.contactPhone')}
        </label>
        <form.Field name="contactPhone">
          {(field) => (
            <Input
              id="bar-phone"
              type="tel"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-notes">
          {t('bars.notes')}
        </label>
        <form.Field name="notes">
          {(field) => (
            <textarea
              id="bar-notes"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              rows={NOTES_ROWS}
              maxLength={BAR_NOTES_MAX_LENGTH}
              className={TEXTAREA_CLASS}
            />
          )}
        </form.Field>
        <div className="flex gap-2 mt-2">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                {t('common.save')}
              </Button>
            )}
          </form.Subscribe>
          <CancelButton label={t('common.cancel')} onCancel={onCancel} />
        </div>
      </form>
    </Card>
  );
}
