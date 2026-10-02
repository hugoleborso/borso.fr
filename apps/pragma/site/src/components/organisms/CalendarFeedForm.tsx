/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { type CalendarFeedFormMode, selectCalendarFeedFormMode } from './calendar-feed-form.utils';

const FIELD_LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
const ADDRESS_MAX_LENGTH = 2_048;

export interface CalendarFeedFormProps {
  readonly state: 'connected' | 'absent';
  readonly message: string | null;
  readonly error: string | null;
  readonly isRemoving: boolean;
  readonly onSave: (address: string) => Promise<void>;
  readonly onRemove: () => void;
}

interface AddressFieldProps {
  readonly onSave: (address: string) => Promise<void>;
  readonly onCancel: (() => void) | null;
}

function AddressField({ onSave, onCancel }: AddressFieldProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { address: '' },
    onSubmit: async ({ value }) => {
      await onSave(value.address.trim());
    },
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-2.5"
    >
      <label className={FIELD_LABEL_CLASS} htmlFor="account-calendar-feed">
        {t('account.calendarFeedAddress')}
      </label>
      <form.Field name="address">
        {(field) => (
          <Input
            id="account-calendar-feed"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            maxLength={ADDRESS_MAX_LENGTH}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            required
          />
        )}
      </form.Field>
      <div className="flex flex-wrap items-center gap-3 mt-1">
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
        {onCancel === null ? null : (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}

// @FollowsBlueprint organism-form
export function CalendarFeedForm(props: CalendarFeedFormProps): JSX.Element {
  const { t } = useTranslation();
  const [isReplacing, setIsReplacing] = useState(false);
  const saveAndClose = async (address: string): Promise<void> => {
    await props.onSave(address);
    setIsReplacing(false);
  };
  const mode = selectCalendarFeedFormMode(props.state, isReplacing);
  const viewByMode: Readonly<Record<CalendarFeedFormMode, JSX.Element>> = {
    entering: <AddressField onSave={saveAndClose} onCancel={null} />,
    replacing: <AddressField onSave={saveAndClose} onCancel={() => setIsReplacing(false)} />,
    connected: (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-900">{t('account.calendarFeedConnected')}</span>
        <Button type="button" variant="default" onClick={() => setIsReplacing(true)}>
          {t('account.calendarFeedReplace')}
        </Button>
        <Button type="button" variant="ghost" onClick={props.onRemove} disabled={props.isRemoving}>
          {t('account.calendarFeedRemove')}
        </Button>
      </div>
    ),
  };

  return (
    <div className="flex flex-col gap-3">
      {viewByMode[mode]}
      {props.error === null ? null : (
        <p className="text-danger text-sm m-0" role="alert">
          {props.error}
        </p>
      )}
      {props.message === null ? null : (
        <p className="text-sm text-ink-500 m-0" role="status">
          {props.message}
        </p>
      )}
    </div>
  );
}
