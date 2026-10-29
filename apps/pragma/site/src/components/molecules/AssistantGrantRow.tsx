/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';

export interface AssistantGrantRowProps {
  readonly clientName: string;
  readonly sinceLabel: string;
  readonly lastUsedLabel: string;
  readonly isRevoking: boolean;
  readonly onRevoke: () => void;
}

// @FollowsBlueprint molecule-presentational
export function AssistantGrantRow(props: AssistantGrantRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex flex-col min-w-0 sm:flex-row sm:items-baseline sm:gap-2">
        <span className="text-ink-900 truncate">{props.clientName}</span>
        <span className="text-xs text-ink-500">
          {props.sinceLabel} · {props.lastUsedLabel}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label={t('account.assistants.revokeLabel', { clientName: props.clientName })}
        disabled={props.isRevoking}
        onClick={props.onRevoke}
      >
        {t('account.assistants.revoke')}
      </Button>
    </li>
  );
}
