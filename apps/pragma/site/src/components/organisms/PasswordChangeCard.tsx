/** @Feature auth */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { useChangePassword } from '../../lib/queries/me.queries';
import { selectLoginErrorMessageKey } from '../../routes/login.core';
import { Card } from '../atoms/Card';
import { PasswordChangeForm } from './PasswordChangeForm';

// @FollowsBlueprint organism-query-owning
export function PasswordChangeCard(): JSX.Element {
  const { t } = useTranslation();
  const changePassword = useChangePassword();
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.changePassword')}</h2>
      <PasswordChangeForm
        message={passwordMessage}
        serverError={passwordError}
        onSubmit={async (values) => {
          setPasswordError(null);
          setPasswordMessage(null);
          try {
            await changePassword.mutateAsync(values);
            setPasswordMessage(t('account.passwordChanged'));
          } catch (error) {
            const status = error instanceof ApiError ? error.status : null;
            setPasswordError(t(selectLoginErrorMessageKey(status)));
          }
        }}
      />
    </Card>
  );
}
