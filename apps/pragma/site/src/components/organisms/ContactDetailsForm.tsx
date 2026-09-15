/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

const FIELD_LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
const PHONE_MAX_LENGTH = 32;
const EMAIL_MAX_LENGTH = 254;

export interface ContactDetailsValues {
  readonly phone: string;
  readonly email: string;
}

export interface ContactDetailsFormProps {
  readonly initial: ContactDetailsValues;
  readonly message: string | null;
  readonly onSubmit: (values: ContactDetailsValues) => Promise<void>;
}

// @FollowsBlueprint route-form
export function ContactDetailsForm(props: ContactDetailsFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { phone: props.initial.phone, email: props.initial.email },
    onSubmit: async ({ value }) => {
      await props.onSubmit(value);
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
      <label className={FIELD_LABEL_CLASS} htmlFor="account-phone">
        {t('account.phone')}
      </label>
      <form.Field name="phone">
        {(field) => (
          <Input
            id="account-phone"
            type="tel"
            autoComplete="tel"
            maxLength={PHONE_MAX_LENGTH}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <label className={FIELD_LABEL_CLASS} htmlFor="account-email">
        {t('account.email')}
      </label>
      <form.Field name="email">
        {(field) => (
          <Input
            id="account-email"
            type="email"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <div className="flex items-center gap-3 mt-2">
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
        {props.message === null ? null : (
          <span className="text-sm text-ink-500">{props.message}</span>
        )}
      </div>
    </form>
  );
}
