/** @Feature auth */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { RecoverPasswordForm } from '../components/organisms/RecoverPasswordForm';
import { ApiError } from '../lib/api.client';
import { useNavigateTo } from '../lib/navigation.hook';
import { useRecoverPassword } from '../lib/queries/auth.queries';
import { DEFAULT_POST_LOGIN_PATH, selectRecoverErrorMessageKey } from './login.core';

// @FollowsBlueprint route-detail-page
export function RecoverPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const recoverPassword = useRecoverPassword();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="font-display italic text-[32px] sm:text-[40px] leading-none text-ink-900 m-0 mb-2">
          {t('auth.recoverTitle')}
        </h1>
        <p className="text-sm text-ink-500 mb-6">{t('auth.recoverIntro')}</p>
        <RecoverPasswordForm
          serverError={serverError}
          onSubmit={async (values) => {
            setServerError(null);
            try {
              await recoverPassword.mutateAsync(values);
              navigateTo(DEFAULT_POST_LOGIN_PATH, { replace: true });
            } catch (error) {
              const status = error instanceof ApiError ? error.status : null;
              setServerError(t(selectRecoverErrorMessageKey(status)));
            }
          }}
        />
        <p className="mt-4 text-sm text-ink-500">
          <Link to="/login" className="underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
