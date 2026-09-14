/** @Feature auth */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { EnrolForm } from '../components/organisms/EnrolForm';
import { ApiError } from '../lib/api.client';
import { useNavigateTo } from '../lib/navigation.hook';
import { useEnrol, useEnrolmentOffers } from '../lib/queries/auth.queries';
import { DEFAULT_POST_LOGIN_PATH, selectEnrolErrorMessageKey } from './login.core';

// @FollowsBlueprint route-detail-page
export function EnrolPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const offers = useEnrolmentOffers();
  const enrol = useEnrol();
  const [serverError, setServerError] = useState<string | null>(null);
  const availableOffers = offers.data ?? [];
  const hasCandidate = availableOffers.length > 0;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="font-display italic text-[32px] sm:text-[40px] leading-none text-ink-900 m-0 mb-2">
          {t('auth.enrolTitle')}
        </h1>
        <p className="text-sm text-ink-500 mb-6">{t('auth.enrolIntro')}</p>
        {hasCandidate ? (
          <EnrolForm
            offers={availableOffers}
            serverError={serverError}
            onSubmit={async (values) => {
              setServerError(null);
              try {
                await enrol.mutateAsync(values);
                navigateTo(DEFAULT_POST_LOGIN_PATH, { replace: true });
              } catch (error) {
                const status = error instanceof ApiError ? error.status : null;
                const body = error instanceof ApiError ? error.body : null;
                setServerError(t(selectEnrolErrorMessageKey(status, body)));
              }
            }}
          />
        ) : (
          <p className="text-sm text-ink-700" role="status">
            {t('auth.enrolClosed')}
          </p>
        )}
        <p className="mt-4 text-sm text-ink-500">
          <Link to="/login" className="underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
