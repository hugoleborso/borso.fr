import { isSignInPassword } from '@domain/sign-in.core';
import { useForm, useSelector } from '@tanstack/react-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';
import { type SignInFailure, selectSignInFailure } from '@/lib/account-session.core';
import { useSignIn } from '@/lib/queries/account.queries';

const PASSWORD_FIELD_ID = 'sign-in-password';

const FAILURE_KEY_BY_FAILURE = {
  'invalid-credentials': 'account.refusal.invalid-credentials',
  'rate-limited': 'account.refusal.rate-limited',
  'auth-not-bootstrapped': 'account.refusal.auth-not-bootstrapped',
  unavailable: 'account.refusal.unavailable',
} as const satisfies Record<SignInFailure, string>;

const SUBMIT_KEY_BY_PENDING = {
  pending: 'account.submitting',
  idle: 'account.submit',
} as const;

interface SignInScreenProps {
  onClose: () => void;
}

// @FollowsBlueprint organism-form
export function SignInScreen({ onClose }: SignInScreenProps) {
  const { t } = useTranslation();
  const signIn = useSignIn();
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const form = useForm({
    defaultValues: { password: '' },
    onSubmit: async ({ value }) => {
      setFailure(null);
      await signIn
        .mutateAsync(value.password)
        .then(onClose)
        .catch((error: unknown) => {
          setFailure(selectSignInFailure(error));
        });
    },
  });
  const password = useSelector(form.store, (state) => state.values.password);
  const isSubmittable = isSignInPassword(password) && !signIn.isPending;
  const submitKey = SUBMIT_KEY_BY_PENDING[signIn.isPending ? 'pending' : 'idle'];

  return (
    <Panel title={t('account.dialog-title')}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <p className="max-w-[65ch] text-sm text-ink-muted">{t('account.dialog-hint')}</p>
        <label className="flex flex-col gap-1 font-semibold" htmlFor={PASSWORD_FIELD_ID}>
          {t('account.password')}
          <input
            id={PASSWORD_FIELD_ID}
            className="min-h-12 w-full px-3 py-2 rounded-md border-[1.5px] border-ink bg-field text-base text-ink font-normal"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              form.setFieldValue('password', event.target.value);
            }}
          />
        </label>
        {failure === null ? null : (
          <p
            className="px-3 py-2 rounded-md bg-missed text-on-missed text-sm font-bold"
            role="alert"
          >
            {t(FAILURE_KEY_BY_FAILURE[failure])}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            label={t(submitKey)}
            variant="primary"
            isDisabled={!isSubmittable}
            onActivate={() => {
              void form.handleSubmit();
            }}
          />
          <Button label={t('account.close')} onActivate={onClose} />
        </div>
      </form>
    </Panel>
  );
}
