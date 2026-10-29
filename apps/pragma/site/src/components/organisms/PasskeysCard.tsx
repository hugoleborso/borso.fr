/** @Feature auth */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guessDeviceName } from '../../lib/device.utils';
import { isPasskeySupported } from '../../lib/passkey.adapter';
import {
  type PasskeySummary,
  usePasskeys,
  useRegisterPasskey,
  useRemovePasskey,
} from '../../lib/queries/me.queries';
import { Card } from '../atoms/Card';
import { PasskeyList } from './PasskeyList';
import { PasskeyNameSheet } from './PasskeyNameSheet';

// @FollowsBlueprint organism-query-owning
export function PasskeysCard(): JSX.Element | null {
  const { t } = useTranslation();
  const passkeys = usePasskeys();
  const registerPasskey = useRegisterPasskey();
  const removePasskey = useRemovePasskey();
  const [createdPasskey, setCreatedPasskey] = useState<PasskeySummary | null>(null);

  if (!isPasskeySupported()) return null;

  const turnOnQuickSignIn = (): void => {
    const label =
      guessDeviceName(navigator.userAgent, navigator.maxTouchPoints) ??
      t('account.passkeyDefaultLabel');
    registerPasskey.mutate({ label }, { onSuccess: setCreatedPasskey });
  };

  return (
    <Card className="p-4 sm:p-6">
      <PasskeyList
        passkeys={passkeys.data ?? []}
        isAdding={registerPasskey.isPending}
        onAdd={turnOnQuickSignIn}
        onRemove={(passkeyId) => removePasskey.mutate({ passkeyId })}
      />
      {createdPasskey === null ? null : (
        <PasskeyNameSheet
          passkeyId={createdPasskey.id}
          suggestedLabel={createdPasskey.label}
          onClose={() => setCreatedPasskey(null)}
        />
      )}
    </Card>
  );
}
