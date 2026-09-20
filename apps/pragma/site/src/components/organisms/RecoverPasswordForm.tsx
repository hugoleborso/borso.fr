/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { PasswordField } from '../molecules/PasswordField';

const PASSWORD_MIN_LENGTH = 8;

export interface RecoverPasswordFormValues {
  readonly username: string;
  readonly sharedPassword: string;
  readonly newPassword: string;
}

export interface RecoverPasswordFormProps {
  readonly serverError: string | null;
  readonly onSubmit: (values: RecoverPasswordFormValues) => Promise<void>;
}

// @FollowsBlueprint route-form
export function RecoverPasswordForm({
  serverError,
  onSubmit,
}: RecoverPasswordFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { username: '', sharedPassword: '', newPassword: '' },
    onSubmit: async ({ value }) => {
      await onSubmit({ ...value, username: value.username.trim().toLowerCase() });
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
      <label
        htmlFor="recover-username"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.usernameLabel')}
      </label>
      <form.Field name="username">
        {(field) => (
          <Input
            id="recover-username"
            type="text"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="username"
            required
          />
        )}
      </form.Field>
      <label
        htmlFor="recover-shared-password"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.sharedPasswordLabel')}
      </label>
      <form.Field name="sharedPassword">
        {(field) => (
          <PasswordField
            id="recover-shared-password"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="off"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        )}
      </form.Field>
      <label
        htmlFor="recover-new-password"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.newPasswordLabel')}
      </label>
      <form.Field name="newPassword">
        {(field) => (
          <PasswordField
            id="recover-new-password"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            variant="accent"
            disabled={!canSubmit || isSubmitting}
            className="mt-2"
          >
            {t('auth.recoverSubmit')}
          </Button>
        )}
      </form.Subscribe>
      {serverError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {serverError}
        </p>
      )}
    </form>
  );
}
