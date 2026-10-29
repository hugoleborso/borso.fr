import { BAR_NAME_MAX_LENGTH, BAR_NOTES_MAX_LENGTH, BAR_STATUSES } from '@domain/bar-profile.core';
/** @Feature bars */

import { useForm } from '@tanstack/react-form';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Input } from '../atoms/Input';
import { inputVariants } from '../atoms/input.variants';
import { AvailableSupportField, ConcertMoodField } from '../molecules/BarQualificationFields';
import { Sheet } from '../molecules/Sheet';
import {
  BAR_STATUS_KEY,
  type BarFormInitial,
  type BarFormSubmitPayload,
  type BarFormValues,
  barFormValuesSchema,
  buildBarPayloadFromFormValues,
  parseBarStatus,
  selectBarFormTitleKind,
} from '../../routes/bars/bar-form.core';

export interface BarOwnerOption {
  readonly id: string;
  readonly firstName: string;
}

interface BarFormProps {
  readonly initial: BarFormInitial;
  readonly owners: readonly BarOwnerOption[];
  readonly copyMessageLabel: string;
  readonly onCopyMessage: (barName: string) => void;
  readonly onSubmit: (id: string | null, payload: BarFormSubmitPayload) => void;
  readonly onCancel: () => void;
  readonly leading?: ReactNode;
}

const FIELD_LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SELECT_CLASS = inputVariants({ size: 'md' });
const NOTES_ROWS = 4;

/**
 * @Blueprint route-form
 * @BlueprintName Route Form
 * @BlueprintUsage Use for any form. One `useForm` call, fields as render props, and no field state in `useState`.
 * @BlueprintDescription Drives every field through `useForm` from `@tanstack/react-form`, validating on change with the Zod schema the core module also uses to type the values, so the fields and the payload cannot disagree. Each field is a `form.Field` render prop rather than a state variable, the submit button reads `canSubmit` and `isSubmitting` through `form.Subscribe` so only that button re-renders, and the values to payload translation is a pure function in `bar-form.core.ts`.
 */
export function BarForm({
  initial,
  owners,
  copyMessageLabel,
  onCopyMessage,
  onSubmit,
  onCancel,
  leading,
}: BarFormProps): JSX.Element {
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
    ownerMemberId: initial.ownerMemberId,
    concertMood: initial.concertMood,
    availableSupport: [...initial.availableSupport],
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

  return (
    <Sheet
      title={title}
      label={title}
      isTitleARecordName={titleKind === 'existing'}
      onClose={onCancel}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <>
          <form.Subscribe selector={(state) => state.values.name}>
            {(barName) => (
              <Button
                icon="copy"
                type="button"
                variant="quiet"
                onClick={() => onCopyMessage(barName)}
              >
                {copyMessageLabel}
              </Button>
            )}
          </form.Subscribe>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                icon="check"
                type="submit"
                variant="primary"
                size="lg"
                disabled={!canSubmit || isSubmitting}
              >
                {t('common.save')}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        {leading}
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-name">
          {t('bars.name')}
        </label>
        <form.Field name="name">
          {(field) => (
            <Input
              id="bar-name"
              data-sheet-focus
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
        <form.Field name="concertMood">
          {(field) => (
            <ConcertMoodField
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <form.Field name="availableSupport">
          {(field) => (
            <AvailableSupportField
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-owner">
          {t('bars.owner')}
        </label>
        <form.Field name="ownerMemberId">
          {(field) => (
            <select
              id="bar-owner"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              className={SELECT_CLASS}
            >
              <option value="">{t('bars.ownerNone')}</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.firstName}
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
            <AutoGrowTextarea
              id="bar-notes"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              rows={NOTES_ROWS}
              maxLength={BAR_NOTES_MAX_LENGTH}
              className="font-display italic"
            />
          )}
        </form.Field>
      </div>
    </Sheet>
  );
}
