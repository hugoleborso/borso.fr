/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildSignInPayload,
  credentialsFormSchema,
  type CredentialsFormValues,
} from './sign-in-form.core';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

const PASSWORD_MIN_LENGTH = 8;

export interface SignInFormProps {
  readonly serverError: string | null;
  readonly onSubmit: (values: CredentialsFormValues) => Promise<void>;
}

// @FollowsBlueprint route-form
export function SignInForm({ serverError, onSubmit }: SignInFormProps): JSX.Element {
  const { t } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
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
          <div className="relative">
            <Input
              id="login-password"
              type={passwordVisible ? 'text' : 'password'}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              autoComplete="current-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
              aria-pressed={passwordVisible}
              className="absolute inset-y-0 right-0 w-11 min-h-11 flex items-center justify-center text-ink-400 hover:text-ink-700 bg-transparent border-0 cursor-pointer"
            >
              <Icon name={passwordVisible ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
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
