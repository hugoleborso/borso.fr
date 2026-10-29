/** @Feature members */

import { MEMBER_FIRST_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Sheet } from '../molecules/Sheet';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import {
  type InstrumentListState,
  type InstrumentRow,
  type MemberFormMode,
  type MemberFormValues,
  selectInstrumentListState,
  toggleInstrumentAssignment,
} from '../../routes/members/members-page.core';

const FIELD_LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const CHECKBOX_ROW_CLASS =
  'flex items-center gap-2.5 min-h-11 text-meta text-ink cursor-pointer select-none';
const CHECKBOX_CLASS = 'w-5 h-5 accent-accent';
const FIRST_NAME_MIN_LENGTH = 1;

interface MemberEditFormProps {
  readonly mode: MemberFormMode;
  readonly initialValues: MemberFormValues;
  readonly instruments: readonly InstrumentRow[];
  readonly assignedInstrumentIds: readonly string[];
  readonly onSave: (values: MemberFormValues) => void;
  readonly onCancel: () => void;
  readonly onInstrumentsChanged: (instrumentIds: readonly string[]) => void;
}

interface InstrumentPanelProps {
  readonly instruments: readonly InstrumentRow[];
  readonly assignedInstrumentIds: readonly string[];
  readonly onInstrumentsChanged: (instrumentIds: readonly string[]) => void;
}

function NoInstrumentPanel(): null {
  return null;
}

function NoInstrumentsNotice(): null {
  return null;
}

function EmptyInstrumentsNotice(): JSX.Element {
  const { t } = useTranslation();
  return <p className="text-meta italic text-ink-soft">{t('members.noInstrumentsYet')}</p>;
}

const EMPTY_NOTICE_BY_LIST_STATE: Record<InstrumentListState, () => JSX.Element | null> = {
  empty: EmptyInstrumentsNotice,
  filled: NoInstrumentsNotice,
};

function InstrumentPanel({
  instruments,
  assignedInstrumentIds,
  onInstrumentsChanged,
}: InstrumentPanelProps): JSX.Element {
  const { t } = useTranslation();
  const EmptyNotice = EMPTY_NOTICE_BY_LIST_STATE[selectInstrumentListState(instruments)];
  return (
    <fieldset className="border border-rule rounded-md p-3 mt-2">
      <legend className="text-label tracking-wider uppercase text-ink-soft px-2">
        {t('members.instrumentsAssigned')}
      </legend>
      <EmptyNotice />
      <div className="flex flex-col">
        {instruments.map((instrument) => (
          <label key={instrument.id} className={CHECKBOX_ROW_CLASS}>
            <input
              type="checkbox"
              className={CHECKBOX_CLASS}
              checked={assignedInstrumentIds.includes(instrument.id)}
              onChange={() =>
                onInstrumentsChanged(
                  toggleInstrumentAssignment(assignedInstrumentIds, instrument.id),
                )
              }
            />
            {instrument.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const INSTRUMENT_PANEL_BY_MODE: Record<
  MemberFormMode,
  (props: InstrumentPanelProps) => JSX.Element | null
> = {
  create: NoInstrumentPanel,
  edit: InstrumentPanel,
};

const TITLE_KEY_BY_MODE = {
  create: 'members.newTitle',
  edit: 'members.editTitle',
} as const;

// @FollowsBlueprint route-form
export function MemberEditForm({
  mode,
  initialValues,
  instruments,
  assignedInstrumentIds,
  onSave,
  onCancel,
  onInstrumentsChanged,
}: MemberEditFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { firstName: initialValues.firstName, color: initialValues.color },
    onSubmit: ({ value }) => onSave(value),
  });
  const AssignmentPanel = INSTRUMENT_PANEL_BY_MODE[mode];
  const title = t(TITLE_KEY_BY_MODE[mode]);

  return (
    <Sheet
      title={title}
      label={title}
      onClose={onCancel}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              icon="check"
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitDisabled(canSubmit, isSubmitting)}
            >
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-2.5">
        <label className={FIELD_LABEL_CLASS} htmlFor="member-first-name">
          {t('members.firstName')}
        </label>
        <form.Field name="firstName">
          {(field) => (
            <Input
              id="member-first-name"
              data-sheet-focus
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              minLength={FIRST_NAME_MIN_LENGTH}
              maxLength={MEMBER_FIRST_NAME_MAX_LENGTH}
            />
          )}
        </form.Field>
        <label className={FIELD_LABEL_CLASS} htmlFor="member-color">
          {t('members.color')}
        </label>
        <form.Field name="color">
          {(field) => (
            <input
              id="member-color"
              type="color"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              className="w-full min-h-11 rounded-md bg-leaf border border-rule cursor-pointer"
            />
          )}
        </form.Field>
        <AssignmentPanel
          instruments={instruments}
          assignedInstrumentIds={assignedInstrumentIds}
          onInstrumentsChanged={onInstrumentsChanged}
        />
      </div>
    </Sheet>
  );
}
