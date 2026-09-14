/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { PasswordField } from '../molecules/PasswordField';

const PASSWORD_MIN_LENGTH = 8;

export interface PasswordChangeValues {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface PasswordChangeFormProps {
  readonly message: string | null;
  readonly serverError: string | null;
  readonly onSubmit: (values: PasswordChangeValues) => Promise<void>;
}

// @FollowsBlueprint route-form
export function PasswordChangeForm(props: PasswordChangeFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    onSubmit: async ({ value }) => {
      await props.onSubmit(value);
      form.reset();
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="account-current" className="text-xs uppercase text-ink-400">
        {t('account.currentPassword')}
      </label>
      <form.Field name="currentPassword">
        {(field) => (
          <PasswordField
            id="account-current"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            autoComplete="current-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        )}
      </form.Field>
      <label htmlFor="account-new" className="text-xs uppercase text-ink-400">
        {t('account.newPassword')}
      </label>
      <form.Field name="newPassword">
        {(field) => (
          <PasswordField
            id="account-new"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
            {t('account.changePassword')}
          </Button>
        )}
      </form.Subscribe>
      {props.message === null ? null : (
        <p className="text-sm text-ink-700" role="status">
          {props.message}
        </p>
      )}
      {props.serverError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {props.serverError}
        </p>
      )}
    </form>
  );
}
