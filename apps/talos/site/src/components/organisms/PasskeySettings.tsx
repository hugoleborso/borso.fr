import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Notice } from '../atoms/Notice';
import { SectionTitle } from '../atoms/SectionTitle';
import { PasskeyRow } from '../molecules/PasskeyRow';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE, formatDayWithYear } from '../../lib/calendar-day.utils';
import { isPasskeySupported } from '../../lib/passkey.adapter';
import { useAddPasskey, usePasskeys, useRemovePasskey } from '../../lib/queries/passkey.queries';
import { canRemovePasskey, toLocalIsoDay } from './passkey-settings.core';

// @FollowsBlueprint organism-mutation-panel
export function PasskeySettings(): JSX.Element {
  const { t } = useTranslation();
  const passkeys = usePasskeys();
  const addPasskey = useAddPasskey();
  const removePasskey = useRemovePasskey();
  const registeredPasskeys = passkeys.data?.items ?? [];
  const isRemovable = canRemovePasskey(registeredPasskeys.length);
  const isAddingSupported = isPasskeySupported();

  return (
    <Card>
      <SectionTitle>{t('settings.passkeys.title')}</SectionTitle>
      {passkeys.data === undefined ? (
        <QueryState isPending={passkeys.isPending} onRetry={() => void passkeys.refetch()} />
      ) : (
        <ul className="m-0 p-0 list-none">
          {registeredPasskeys.map((passkey, index) => {
            const date = formatDayWithYear(toLocalIsoDay(passkey.createdAt), DISPLAY_LOCALE);
            return (
              <PasskeyRow
                key={passkey.id}
                title={t('settings.passkeys.item', { rank: index + 1 })}
                addedOnLabel={t('settings.passkeys.added-on', { date })}
                removeLabel={t('settings.passkeys.remove-label', { date })}
                isRemovable={isRemovable}
                onRemove={() => removePasskey.mutate(passkey.id)}
              />
            );
          })}
        </ul>
      )}
      {isAddingSupported ? (
        <Button
          variant="secondary"
          className="w-full mt-3"
          disabled={addPasskey.isPending}
          onClick={() => addPasskey.mutate()}
        >
          <Icon name="plus" size={18} />
          {t('settings.passkeys.add')}
        </Button>
      ) : (
        <div className="mt-3">
          <Notice>{t('auth.unsupported')}</Notice>
        </div>
      )}
    </Card>
  );
}
