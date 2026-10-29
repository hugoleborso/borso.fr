import { BAR_NAME_MAX_LENGTH, BAR_NOTES_MAX_LENGTH } from '@domain/bar-profile.core';
/** @Feature bars */

import { useForm } from '@tanstack/react-form';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Input } from '../atoms/Input';
import {
  AvailableSupportField,
  type BarOwnerOption,
  BarOwnerField,
  BarStatusField,
  ConcertMoodField,
} from '../molecules/BarQualificationFields';
import { Sheet } from '../molecules/Sheet';
import {
  type BarFormInitial,
  type BarFormSubmitPayload,
  type BarFormValues,
  barFormValuesSchema,
  buildBarPayloadFromFormValues,
  selectBarFormTitleKind,
} from '../../routes/bars/bar-form.core';

export type { BarOwnerOption } from '../molecules/BarQualificationFields';

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
const NOTES_ROWS = 3;
const FIELD_CLASS = 'flex min-w-0 flex-col gap-1.5';
const PAIR_CLASS = 'grid grid-cols-2 gap-3';
const QUALIFICATION_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
const GROUP_CLASS = 'flex flex-col gap-4 border-t border-rule pt-4';

function LabelledField(props: {
  readonly id: string;
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className={FIELD_CLASS}>
      <label className={FIELD_LABEL_CLASS} htmlFor={props.id}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

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
      <div className="flex flex-col gap-4">
        {leading}
        <LabelledField id="bar-name" label={t('bars.name')}>
          <form.Field name="name">
            {(field) => (
              <Input
                id="bar-name"
                data-sheet-focus
                type="text"
                autoComplete="off"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={BAR_NAME_MAX_LENGTH}
              />
            )}
          </form.Field>
        </LabelledField>
        <div className={PAIR_CLASS}>
          <div className={FIELD_CLASS}>
            <form.Field name="status">
              {(field) => (
                <BarStatusField
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </div>
          <div className={FIELD_CLASS}>
            <form.Field name="ownerMemberId">
              {(field) => (
                <BarOwnerField
                  owners={owners}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </div>
        </div>
        <div className={PAIR_CLASS}>
          <LabelledField id="bar-city" label={t('bars.city')}>
            <form.Field name="city">
              {(field) => (
                <Input
                  id="bar-city"
                  type="text"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </LabelledField>
          <LabelledField id="bar-capacity" label={t('bars.capacity')}>
            <form.Field name="capacity">
              {(field) => (
                <Input
                  id="bar-capacity"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </LabelledField>
        </div>
        <div className={QUALIFICATION_CLASS}>
          <div className={FIELD_CLASS}>
            <form.Field name="concertMood">
              {(field) => (
                <ConcertMoodField
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </div>
          <div className={FIELD_CLASS}>
            <form.Field name="availableSupport">
              {(field) => (
                <AvailableSupportField
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </div>
        </div>
        <div className={GROUP_CLASS}>
          <LabelledField id="bar-contact" label={t('bars.contactName')}>
            <form.Field name="contactName">
              {(field) => (
                <Input
                  id="bar-contact"
                  type="text"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </LabelledField>
          <div className={PAIR_CLASS}>
            <LabelledField id="bar-phone" label={t('bars.contactPhone')}>
              <form.Field name="contactPhone">
                {(field) => (
                  <Input
                    id="bar-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </LabelledField>
            <LabelledField id="bar-email" label={t('bars.contactEmail')}>
              <form.Field name="contactEmail">
                {(field) => (
                  <Input
                    id="bar-email"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </LabelledField>
          </div>
        </div>
        <LabelledField id="bar-notes" label={t('bars.notes')}>
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
        </LabelledField>
      </div>
    </Sheet>
  );
}
