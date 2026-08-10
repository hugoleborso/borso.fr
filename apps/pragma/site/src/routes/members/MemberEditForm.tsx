/**
 * Create / edit form for one member, plus the instrument assignment
 * panel that only exists once a member is selected.
 *
 * The parent gives the form a key derived from the selected member, so
 * picking another member remounts the form and the fields start from
 * the new values. Nothing copies the selection into field state.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import {
  type InstrumentListState,
  type InstrumentRow,
  type MemberFormMode,
  type MemberFormValues,
  selectInstrumentListState,
  toggleInstrumentAssignment,
} from './members-page.core';

const FIELD_LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';
const FIRST_NAME_MIN_LENGTH = 1;
const FIRST_NAME_MAX_LENGTH = 64;

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
  return <p className="text-xs italic text-ink-400">{t('members.noInstrumentsYet')}</p>;
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
    <fieldset className="border border-line rounded-md p-3 mt-2">
      <legend className="text-[11px] tracking-wider uppercase text-ink-400 px-2">
        {t('members.instrumentsAssigned')}
      </legend>
      <EmptyNotice />
      <div className="flex flex-col gap-1.5">
        {instruments.map((instrument) => (
          <label
            key={instrument.id}
            className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer"
          >
            <input
              type="checkbox"
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

interface CancelProps {
  readonly label: string;
  readonly onCancel: () => void;
}

function NoCancelButton(): null {
  return null;
}

function CancelEditButton({ label, onCancel }: CancelProps): JSX.Element {
  return (
    <Button type="button" variant="ghost" onClick={onCancel}>
      {label}
    </Button>
  );
}

const INSTRUMENT_PANEL_BY_MODE: Record<
  MemberFormMode,
  (props: InstrumentPanelProps) => JSX.Element | null
> = {
  create: NoInstrumentPanel,
  edit: InstrumentPanel,
};

const CANCEL_BUTTON_BY_MODE: Record<MemberFormMode, (props: CancelProps) => JSX.Element | null> = {
  create: NoCancelButton,
  edit: CancelEditButton,
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
  const CancelButton = CANCEL_BUTTON_BY_MODE[mode];

  return (
    <Card>
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">
        {t(TITLE_KEY_BY_MODE[mode])}
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-2.5"
      >
        <label className={FIELD_LABEL_CLASS} htmlFor="member-first-name">
          {t('members.firstName')}
        </label>
        <form.Field name="firstName">
          {(field) => (
            <Input
              id="member-first-name"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              minLength={FIRST_NAME_MIN_LENGTH}
              maxLength={FIRST_NAME_MAX_LENGTH}
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
              className="w-full h-10 rounded-md bg-bg-elev border border-line cursor-pointer"
            />
          )}
        </form.Field>
        <AssignmentPanel
          instruments={instruments}
          assignedInstrumentIds={assignedInstrumentIds}
          onInstrumentsChanged={onInstrumentsChanged}
        />
        <div className="flex gap-2 mt-2">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="accent"
                disabled={isSubmitDisabled(canSubmit, isSubmitting)}
              >
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
