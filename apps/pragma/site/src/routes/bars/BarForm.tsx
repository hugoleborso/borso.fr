/**
 * Bar edit / create form. Owns its field state via `useForm` from
 * `@tanstack/react-form`. The parent supplies the initial bar (or
 * null for create) plus a single `onSubmit(payload)` callback; the
 * form keys on `initialBar?.id` so React mounts a fresh instance
 * whenever the parent selects a different row.
 *
 * Validation is field-level via the Zod schema in `bar-form.schema`,
 * which mirrors the BE's `barInsertSchema` shape.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';

export const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;
export type BarStatus = (typeof BAR_STATUSES)[number];

export const BAR_STATUS_KEY = {
  lead: 'bars.statusLead',
  contacted: 'bars.statusContacted',
  booked: 'bars.statusBooked',
  played: 'bars.statusPlayed',
  cold: 'bars.statusCold',
} as const satisfies Record<BarStatus, string>;

const BAR_NAME_MAX = 256;
const BAR_NOTES_MAX = 4_096;
const BAR_FIELD_MAX = 256;

const barFormValuesSchema = z.object({
  name: z.string().trim().min(1).max(BAR_NAME_MAX),
  status: z.enum(BAR_STATUSES),
  notes: z.string().max(BAR_NOTES_MAX),
  city: z.string().max(BAR_FIELD_MAX),
  capacity: z.string().regex(/^\d*$/u),
  contactName: z.string().max(BAR_FIELD_MAX),
  contactEmail: z.string().max(BAR_FIELD_MAX),
  contactPhone: z.string().max(BAR_FIELD_MAX),
});

export type BarFormValues = z.infer<typeof barFormValuesSchema>;

export interface BarFormSubmitPayload {
  readonly name: string;
  readonly status: BarStatus;
  readonly notes: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly contactName: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
}

export interface BarFormInitial {
  readonly id: string | null;
  readonly name: string;
  readonly status: BarStatus;
  readonly notes: string;
  readonly city: string;
  readonly capacity: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
}

export const BLANK_BAR_FORM: BarFormInitial = {
  id: null,
  name: '',
  status: 'lead',
  notes: '',
  city: '',
  capacity: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

function payloadFromValues(values: BarFormValues): BarFormSubmitPayload {
  return {
    name: values.name.trim(),
    status: values.status,
    notes: values.notes,
    city: values.city.length === 0 ? null : values.city,
    capacity: values.capacity.length === 0 ? null : Number(values.capacity),
    contactName: values.contactName.length === 0 ? null : values.contactName,
    contactEmail: values.contactEmail.length === 0 ? null : values.contactEmail,
    contactPhone: values.contactPhone.length === 0 ? null : values.contactPhone,
  };
}

interface BarFormProps {
  readonly initial: BarFormInitial;
  readonly onSubmit: (id: string | null, payload: BarFormSubmitPayload) => void;
  readonly onCancel: () => void;
}

const FIELD_LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

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
      onSubmit(initial.id, payloadFromValues(value));
    },
  });
  return (
    <Card>
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">
        {initial.id === null ? t('bars.newBar') : initial.name}
      </h3>
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
              maxLength={BAR_NAME_MAX}
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
                const parsed = z.enum(BAR_STATUSES).safeParse(event.target.value);
                if (parsed.success) field.handleChange(parsed.data);
              }}
              onBlur={field.handleBlur}
              className="w-full bg-bg-elev border border-line text-ink-900 rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink-700"
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
              rows={4}
              maxLength={BAR_NOTES_MAX}
              className="w-full bg-bg-elev border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
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
          {initial.id === null ? null : (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
