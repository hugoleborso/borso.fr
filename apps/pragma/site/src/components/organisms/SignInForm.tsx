/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildSignInPayload,
  credentialsFormSchema,
  type CredentialsFormValues,
} from './sign-in-form.core';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { PasswordField } from '../molecules/PasswordField';

const PASSWORD_MIN_LENGTH = 8;

export interface SignInFormProps {
  readonly serverError: string | null;
  readonly onSubmit: (values: CredentialsFormValues) => Promise<void>;
}

// @FollowsBlueprint route-form
export function SignInForm({ serverError, onSubmit }: SignInFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { username: '', password: '' },
    validators: { onChange: credentialsFormSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(buildSignInPayload(value));
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
        htmlFor="login-username"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.usernameLabel')}
      </label>
      <form.Field name="username">
        {(field) => (
          <Input
            id="login-username"
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
        htmlFor="login-password"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.passwordLabel')}
      </label>
      <form.Field name="password">
        {(field) => (
          <PasswordField
            id="login-password"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="current-password"
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
            {t('auth.submit')}
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
