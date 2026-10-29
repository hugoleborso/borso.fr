/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { PasskeySummary } from '../../lib/queries/me.queries';
import { Button } from '../atoms/Button';

export interface PasskeyListProps {
  readonly passkeys: readonly PasskeySummary[];
  readonly isAdding: boolean;
  readonly onAdd: () => void;
  readonly onRemove: (passkeyId: string) => void;
}

// @FollowsBlueprint organism-mutation-panel
export function PasskeyList(props: PasskeyListProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <>
      {props.passkeys.length === 0 ? null : (
        <ul className="list-none p-0 m-0 mb-4 flex flex-col gap-2">
          {props.passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center justify-between gap-3">
              <span className="text-ink">{passkey.label}</span>
              <Button
                icon="trash"
                type="button"
                variant="quiet"
                onClick={() => props.onRemove(passkey.id)}
              >
                {t('account.removePasskey')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        icon="fingerprint"
        type="button"
        variant="secondary"
        disabled={props.isAdding}
        onClick={props.onAdd}
      >
        {t('account.addPasskey')}
      </Button>
    </>
  );
}
