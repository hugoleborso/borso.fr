/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Input } from '../components/atoms/Input';
import { ApiError } from '../lib/api.client';
import { useNavigateTo } from '../lib/navigation.hook';
import { useEnrol, useEnrolmentOffers } from '../lib/queries/auth.queries';
import { DEFAULT_POST_LOGIN_PATH, selectEnrolErrorMessageKey } from './login.core';

// @FollowsBlueprint route-form
export function EnrolPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const offers = useEnrolmentOffers();
  const enrol = useEnrol();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { memberId: '', username: '', password: '', sharedPassword: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await enrol.mutateAsync({
          memberId: value.memberId,
          username: value.username.trim().toLowerCase(),
          password: value.password,
          sharedPassword: value.sharedPassword,
        });
        navigateTo(DEFAULT_POST_LOGIN_PATH, { replace: true });
      } catch (error) {
        const status = error instanceof ApiError ? error.status : null;
        const body = error instanceof ApiError ? error.body : null;
        setServerError(t(selectEnrolErrorMessageKey(status, body)));
      }
    },
  });

  const availableOffers = offers.data ?? [];

  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="font-display italic text-[32px] sm:text-[40px] leading-none text-ink-900 m-0 mb-2">
          {t('auth.enrolTitle')}
        </h1>
        <p className="text-sm text-ink-500 mb-6">{t('auth.enrolIntro')}</p>
        {availableOffers.length === 0 ? (
          <p className="text-sm text-ink-700" role="status">
            {t('auth.enrolClosed')}
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-3"
          >
            <label
              htmlFor="enrol-member"
              className="text-xs tracking-wider uppercase text-ink-400 font-medium"
            >
              {t('auth.enrolMember')}
            </label>
            <form.Field name="memberId">
              {(field) => (
                <select
                  id="enrol-member"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    const picked = availableOffers.find(
                      (offer) => offer.memberId === event.target.value,
                    );
                    form.setFieldValue('username', picked?.suggestedUsername ?? '');
                  }}
                  required
                  className="min-h-11 rounded-lg border border-line bg-surface px-3 text-ink-900"
                >
                  <option value="">—</option>
                  {availableOffers.map((offer) => (
                    <option key={offer.memberId} value={offer.memberId}>
                      {offer.firstName}
                    </option>
                  ))}
                </select>
              )}
            </form.Field>

            <label
              htmlFor="enrol-username"
              className="text-xs tracking-wider uppercase text-ink-400 font-medium"
            >
              {t('auth.usernameLabel')}
            </label>
            <form.Field name="username">
              {(field) => (
                <Input
                  id="enrol-username"
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
              htmlFor="enrol-shared"
              className="text-xs tracking-wider uppercase text-ink-400 font-medium"
            >
              {t('auth.sharedPasswordLabel')}
            </label>
            <form.Field name="sharedPassword">
              {(field) => (
                <Input
                  id="enrol-shared"
                  type="password"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="off"
                  required
                  minLength={8}
                />
              )}
            </form.Field>

            <label
              htmlFor="enrol-password"
              className="text-xs tracking-wider uppercase text-ink-400 font-medium"
            >
              {t('auth.passwordLabel')}
            </label>
            <form.Field name="password">
              {(field) => (
                <Input
                  id="enrol-password"
                  type="password"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="new-password"
                  required
                  minLength={8}
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
                  {t('auth.enrolSubmit')}
                </Button>
              )}
            </form.Subscribe>
            {serverError === null ? null : (
              <p className="text-danger text-sm" role="alert">
                {serverError}
              </p>
            )}
          </form>
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
