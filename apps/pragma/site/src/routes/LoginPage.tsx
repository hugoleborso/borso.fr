/** @Feature auth */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { SignInForm } from '../components/organisms/SignInForm';
import { ApiError } from '../lib/api.client';
import { useNavigateTo } from '../lib/navigation.hook';
import { isPasskeySupported } from '../lib/passkey.adapter';
import { useLogin, usePasskeyLogin } from '../lib/queries/auth.queries';
import { selectLoginErrorMessageKey, selectPostLoginPath } from './login.core';

// @FollowsBlueprint route-detail-page
export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const location = useLocation();
  const login = useLogin();
  const passkeyLogin = usePasskeyLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const hasPasskeySupport = isPasskeySupported();

  return (
    <main className="min-h-dvh flex items-center justify-center bg-paper px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="font-display text-display sm:text-display leading-none tracking-[-0.015em] text-ink m-0 mb-1">
          {t('appName')}
        </h1>
        <p className="text-label tracking-[0.18em] uppercase text-ink-soft mb-6">
          {t('appWordmark')}
        </p>
        <SignInForm
          serverError={serverError}
          onSubmit={async (values) => {
            setServerError(null);
            try {
              await login.mutateAsync(values);
              navigateTo(selectPostLoginPath(location.state), { replace: true });
            } catch (error) {
              const status = error instanceof ApiError ? error.status : null;
              setServerError(t(selectLoginErrorMessageKey(status)));
            }
          }}
        />
        {hasPasskeySupport ? (
          <Button
            icon="fingerprint"
            type="button"
            variant="quiet"
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
        <p className="mt-4 text-meta text-ink-soft">
          <Link to="/recover" className="underline">
            {t('auth.recoverLink')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
