/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { isPasskeySupported } from '../../lib/passkey.adapter';
import { usePasskeys, useRegisterPasskey, useRemovePasskey } from '../../lib/queries/me.queries';
import { Card } from '../atoms/Card';
import { PasskeyList } from './PasskeyList';

// @FollowsBlueprint organism-query-owning
export function PasskeysCard(): JSX.Element {
  const { t } = useTranslation();
  const passkeys = usePasskeys();
  const registerPasskey = useRegisterPasskey();
  const removePasskey = useRemovePasskey();
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-body text-ink m-0 mb-3">{t('account.passkeys')}</h2>
      <PasskeyList
        passkeys={passkeys.data ?? []}
        canAdd={isPasskeySupported()}
        isAdding={registerPasskey.isPending}
        onAdd={(label) => registerPasskey.mutate({ label })}
        onRemove={(passkeyId) => removePasskey.mutate({ passkeyId })}
      />
    </Card>
  );
}
