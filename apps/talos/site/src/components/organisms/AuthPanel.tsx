import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Notice } from '../atoms/Notice';
import { Spinner } from '../atoms/Spinner';
import { ApiError } from '../../lib/api.client';
import { isPasskeySupported } from '../../lib/passkey.adapter';
import { usePasskeySignIn, useRegisterPasskey } from '../../lib/queries/passkey.queries';
import { useSession } from '../../lib/queries/session.queries';
import { canSubmitBootstrapCode, selectAuthErrorKey, selectAuthStep } from './auth-panel.core';

function readFailureStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

interface StepProps {
  readonly onSignedIn: () => void;
  readonly onFailure: (error: unknown) => void;
}

function SignInStep({ onSignedIn, onFailure }: StepProps): JSX.Element {
  const { t } = useTranslation();
  const signIn = usePasskeySignIn();
  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      disabled={signIn.isPending}
      onClick={() => {
        signIn.mutate(undefined, { onSuccess: onSignedIn, onError: onFailure });
      }}
    >
      {t('auth.sign-in')}
    </Button>
  );
}

function RegisterStep({ onSignedIn, onFailure }: StepProps): JSX.Element {
  const { t } = useTranslation();
  const register = useRegisterPasskey();
  const form = useForm({
    defaultValues: { code: '' },
    onSubmit: async ({ value }) => {
      await register.mutateAsync(value.code.trim()).then(onSignedIn, onFailure);
    },
  });
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <p className="m-0 text-body-sm text-ink-soft">{t('auth.register.lead')}</p>
      <label htmlFor="bootstrap-code" className="text-body-sm font-medium text-ink-soft">
        {t('auth.register.code-label')}
      </label>
      <form.Field name="code">
        {(field) => (
          <Input
            id="bootstrap-code"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.values.code, state.isSubmitting] as const}>
        {([code, isSubmitting]) => (
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting || !canSubmitBootstrapCode(code)}
          >
            {t('auth.register.submit')}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

const STEP_VIEW = { register: RegisterStep, 'sign-in': SignInStep } as const;

// @FollowsBlueprint organism-form
export function AuthPanel(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const [failureStatus, setFailureStatus] = useState<number | null | undefined>(undefined);
  const isSupported = isPasskeySupported();
  const Step = STEP_VIEW[selectAuthStep(session.data?.registered === true)];
  if (session.data?.signedIn === true) return <Navigate to="/" replace />;

  return (
    <Card padding="lg" className="w-full max-w-sm">
      <div className="flex flex-col items-center text-center mb-6">
        <img src="/icons/icon.svg" alt="" width={64} height={64} className="rounded-lg mb-4" />
        <h1 className="m-0 font-display text-display text-ink">{t('auth.title')}</h1>
        <p className="m-0 mt-1 text-body-sm text-ink-muted">{t('auth.subtitle')}</p>
      </div>
      {session.isPending ? <Spinner label={t('common.loading')} /> : null}
      {isSupported ? null : <Notice tone="danger">{t('auth.unsupported')}</Notice>}
      {session.isSuccess && isSupported ? (
        <Step
          onSignedIn={() => {
            void navigate('/', { replace: true });
          }}
          onFailure={(error) => {
            setFailureStatus(readFailureStatus(error));
          }}
        />
      ) : null}
      {failureStatus === undefined ? null : (
        <div className="mt-3">
          <Notice tone="danger">{t(selectAuthErrorKey(failureStatus))}</Notice>
        </div>
      )}
    </Card>
  );
}
