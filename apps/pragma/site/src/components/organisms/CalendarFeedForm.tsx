/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GOOGLE_CALENDAR_SETTINGS_ADDRESS } from '../../lib/calendar-guide.utils';
import { readTextFromClipboard } from '../../lib/clipboard.adapter';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import { Button } from '../atoms/Button';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import type { CalendarFeedSummary } from '../../lib/queries/me.queries';
import { type CalendarFeedFormMode, selectCalendarFeedFormMode } from './calendar-feed-form.utils';

const FIELD_LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const ADDRESS_MAX_LENGTH = 2_048;

export interface CalendarFeedFormProps {
  readonly feeds: readonly CalendarFeedSummary[];
  readonly message: string | null;
  readonly error: string | null;
  readonly isRemoving: boolean;
  readonly onSave: (address: string) => Promise<void>;
  readonly onRemove: (feedId: string) => void;
}

interface CalendarFeedListProps {
  readonly feeds: readonly CalendarFeedSummary[];
  readonly labelOf: (feed: CalendarFeedSummary) => string;
  readonly isRemoving: boolean;
  readonly onRemove: (feed: CalendarFeedSummary) => void;
}

function CalendarFeedList({
  feeds,
  labelOf,
  isRemoving,
  onRemove,
}: CalendarFeedListProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-2" aria-label={t('account.calendarFeeds')}>
      {feeds.map((feed) => (
        <li key={feed.id} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-ink">
            <Icon name="calendar" size="md" />
            <span className="truncate">{labelOf(feed)}</span>
          </span>
          <Button
            icon="trash"
            type="button"
            variant="quiet"
            onClick={() => onRemove(feed)}
            disabled={isRemoving}
          >
            {t('account.calendarFeedRemove')}
          </Button>
        </li>
      ))}
    </ul>
  );
}

interface AddressFieldProps {
  readonly onSave: (address: string) => Promise<void>;
  readonly onCancel: (() => void) | null;
}

function AddressField({ onSave, onCancel }: AddressFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [hasPasteFailed, setHasPasteFailed] = useState(false);
  const form = useForm({
    defaultValues: { address: '' },
    onSubmit: async ({ value }) => {
      await onSave(value.address.trim());
    },
  });
  const pasteAndConnect = async (): Promise<void> => {
    const pasted = (await readTextFromClipboard())?.trim() ?? '';
    setHasPasteFailed(pasted.length === 0);
    if (pasted.length === 0) return;
    form.setFieldValue('address', pasted);
    await form.handleSubmit();
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-2.5"
    >
      <div className="flex flex-wrap gap-2">
        <ButtonAnchor
          href={GOOGLE_CALENDAR_SETTINGS_ADDRESS}
          variant="secondary"
          mark={<Icon name="external" size="md" />}
        >
          {t('account.calendarGuide.openSettings')}
        </ButtonAnchor>
        <Button
          icon="clipboard"
          type="button"
          variant="secondary"
          onClick={() => void pasteAndConnect()}
        >
          {t('account.calendarGuide.pasteAndConnect')}
        </Button>
      </div>
      {hasPasteFailed ? (
        <p className="m-0 text-meta text-ink-soft" role="status">
          {t('account.calendarGuide.pasteFailed')}
        </p>
      ) : null}
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
              icon="check"
              type="submit"
              variant="secondary"
              disabled={isSubmitDisabled(canSubmit, isSubmitting)}
            >
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
        {onCancel === null ? null : (
          <Button icon="close" type="button" variant="quiet" onClick={onCancel}>
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
  const [isAdding, setIsAdding] = useState(false);
  const [feedToRemove, setFeedToRemove] = useState<CalendarFeedSummary | null>(null);
  const saveAndClose = async (address: string): Promise<void> => {
    await props.onSave(address);
    setIsAdding(false);
  };
  const mode = selectCalendarFeedFormMode(props.feeds.length, isAdding);
  const labelOf = (feed: CalendarFeedSummary): string =>
    feed.name ?? t('account.calendarFeedUnnamed', { position: props.feeds.indexOf(feed) + 1 });
  const addButton = (
    <Button icon="plus" type="button" variant="secondary" onClick={() => setIsAdding(true)}>
      {t('account.calendarFeedAdd')}
    </Button>
  );
  const fieldByMode: Readonly<Record<CalendarFeedFormMode, JSX.Element | null>> = {
    entering: <AddressField onSave={saveAndClose} onCancel={null} />,
    adding: <AddressField onSave={saveAndClose} onCancel={() => setIsAdding(false)} />,
    listing: <div>{addButton}</div>,
    full: (
      <p className="m-0 text-meta text-ink-soft">
        {t('account.calendarFeedsFull', { count: props.feeds.length })}
      </p>
    ),
  };

  return (
    <div className="flex flex-col gap-3">
      {props.feeds.length === 0 ? null : (
        <CalendarFeedList
          feeds={props.feeds}
          labelOf={labelOf}
          isRemoving={props.isRemoving}
          onRemove={setFeedToRemove}
        />
      )}
      {fieldByMode[mode]}
      {feedToRemove === null ? null : (
        <ConfirmDialog
          question={t('account.calendarFeedRemoveQuestion', { name: labelOf(feedToRemove) })}
          confirmLabel={t('account.calendarFeedRemove')}
          onConfirm={() => {
            setFeedToRemove(null);
            props.onRemove(feedToRemove.id);
          }}
          onCancel={() => setFeedToRemove(null)}
        />
      )}
      {props.error === null ? null : (
        <p className="text-danger text-meta m-0" role="alert">
          {props.error}
        </p>
      )}
      {props.message === null ? null : (
        <p className="text-meta text-ink-soft m-0" role="status">
          {props.message}
        </p>
      )}
    </div>
  );
}
