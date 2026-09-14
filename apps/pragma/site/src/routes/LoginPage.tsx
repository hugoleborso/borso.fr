/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Icon } from '../components/atoms/Icon';
import { Input } from '../components/atoms/Input';
import { ApiError } from '../lib/api.client';
import { useNavigateTo } from '../lib/navigation.hook';
import { isPasskeySupported } from '../lib/passkey.adapter';
import { useLogin, usePasskeyLogin } from '../lib/queries/auth.queries';
import { selectLoginErrorMessageKey, selectPostLoginPath } from './login.core';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 64;
const credentialsSchema = z.object({
  username: z.string().trim().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

// @FollowsBlueprint route-form
export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const location = useLocation();
  const login = useLogin();
  const passkeyLogin = usePasskeyLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const hasPasskeySupport = isPasskeySupported();

  const form = useForm({
    defaultValues: { username: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await login.mutateAsync({
          username: value.username.trim().toLowerCase(),
          password: value.password,
        });
        navigateTo(selectPostLoginPath(location.state), { replace: true });
      } catch (error) {
        const status = error instanceof ApiError ? error.status : null;
        setServerError(t(selectLoginErrorMessageKey(status)));
      }
    },
  });

  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="font-display italic text-[36px] sm:text-[44px] leading-none tracking-[-0.015em] text-ink-900 m-0 mb-1">
          {t('appName')}
        </h1>
        <p className="text-xs tracking-[0.18em] uppercase text-ink-500 mb-6">{t('appWordmark')}</p>
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
          <form.Field
            name="username"
            validators={{
              onChange: ({ value }) => {
                const checked = credentialsSchema.shape.username.safeParse(value);
                return checked.success
                  ? undefined
                  : (checked.error.issues[0]?.message ?? 'invalid');
              },
            }}
          >
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
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const checked = credentialsSchema.shape.password.safeParse(value);
                return checked.success
                  ? undefined
                  : (checked.error.issues[0]?.message ?? 'invalid');
              },
            }}
          >
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
                  minLength={8}
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
        {hasPasskeySupport ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            disabled={passkeyLogin.isPending}
            onClick={() => {
              setServerError(null);
              passkeyLogin.mutate(undefined, {
                onSuccess: () => {
                  navigateTo(selectPostLoginPath(location.state), { replace: true });
                },
                onError: () => {
                  setServerError(t('auth.passkeyFailed'));
                },
              });
            }}
          >
            {t('auth.passkeyLogin')}
          </Button>
        ) : null}
        <p className="mt-4 text-sm text-ink-500">
          <Link to="/enrol" className="underline">
            {t('auth.enrolLink')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
