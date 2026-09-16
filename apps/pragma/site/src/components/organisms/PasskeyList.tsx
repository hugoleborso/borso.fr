/** @Feature auth */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PasskeySummary } from '../../lib/queries/me.queries';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

const DEVICE_LABEL_MAX_LENGTH = 64;

export interface PasskeyListProps {
  readonly passkeys: readonly PasskeySummary[];
  readonly canAdd: boolean;
  readonly isAdding: boolean;
  readonly onAdd: (label: string) => void;
  readonly onRemove: (passkeyId: string) => void;
}

// @FollowsBlueprint organism-mutation-panel
export function PasskeyList(props: PasskeyListProps): JSX.Element {
  const { t } = useTranslation();
  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const hasPasskeys = props.passkeys.length > 0;

  return (
    <>
      {hasPasskeys ? (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {props.passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center justify-between gap-3">
              <span className="text-ink-900">{passkey.label}</span>
              <Button type="button" variant="ghost" onClick={() => props.onRemove(passkey.id)}>
                {t('account.removePasskey')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">{t('account.passkeysEmpty')}</p>
      )}
      {props.canAdd ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="passkey-label" className="text-xs uppercase text-ink-400">
              {t('account.passkeyLabel')}
            </label>
            <Input
              id="passkey-label"
              type="text"
              value={deviceLabel}
              maxLength={DEVICE_LABEL_MAX_LENGTH}
              onChange={(event) => setDeviceLabel(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="accent"
            disabled={deviceLabel.trim().length === 0 || props.isAdding}
            onClick={() => {
              props.onAdd(deviceLabel.trim());
              setDeviceLabel('');
            }}
          >
            {t('account.addPasskey')}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-500">{t('account.passkeyUnsupported')}</p>
      )}
    </>
  );
}
