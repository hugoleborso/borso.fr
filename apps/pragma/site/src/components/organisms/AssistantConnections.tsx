/** @Feature auth */

import type { ParseKeys } from 'i18next';
import { type JSX, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import {
  type AssistantInstallationId,
  listAssistantInstallations,
} from '../../lib/assistant-install.utils';
import { API_BASE } from '../../lib/api.client';
import { formatDueDate, formatTimeAgo } from '../../lib/formatters.utils';
import { readPageOrigin } from '../../lib/page-location.adapter';
import {
  useAssistantGrants,
  useRevokeAssistantGrant,
} from '../../lib/queries/assistant-grants.queries';
import { Card } from '../atoms/Card';
import { AssistantGrantRow } from '../molecules/AssistantGrantRow';
import { InstallCommandBlock } from '../molecules/InstallCommandBlock';

interface InstallationTextKeys {
  readonly label: ParseKeys;
  readonly hint: ParseKeys;
}

const INSTALLATION_TEXT_KEYS: Readonly<Record<AssistantInstallationId, InstallationTextKeys>> = {
  'claude-code': {
    label: 'account.assistants.claudeCodeLabel',
    hint: 'account.assistants.claudeCodeHint',
  },
  vibe: { label: 'account.assistants.vibeLabel', hint: 'account.assistants.vibeHint' },
  connector: {
    label: 'account.assistants.connectorLabel',
    hint: 'account.assistants.connectorHint',
  },
};

// @FollowsBlueprint organism-query-owning
export function AssistantConnections(): JSX.Element {
  const { t, i18n } = useTranslation();
  const grants = useAssistantGrants();
  const revokeGrant = useRevokeAssistantGrant();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const installations = listAssistantInstallations({
    apiBase: API_BASE,
    pageOrigin: readPageOrigin(),
  });
  const connectedGrants = grants.data ?? [];

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base text-ink-900 m-0 mb-2">{t('account.assistants.title')}</h2>
      <p className="text-xs text-ink-500 mt-0 mb-4">{t('account.assistants.hint')}</p>
      <div className="flex flex-col gap-5">
        {installations.map((installation) => (
          <InstallCommandBlock
            key={installation.id}
            label={t(INSTALLATION_TEXT_KEYS[installation.id].label)}
            hint={t(INSTALLATION_TEXT_KEYS[installation.id].hint)}
            snippet={installation.snippet}
          />
        ))}
      </div>
      <h3 className="text-sm font-medium text-ink-900 mt-6 mb-1">
        {t('account.assistants.connected')}
      </h3>
      {connectedGrants.length === 0 ? (
        <p className="text-sm text-ink-500 m-0">{t('account.assistants.empty')}</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col divide-y divide-line">
          {connectedGrants.map((grant) => (
            <AssistantGrantRow
              key={grant.id}
              clientName={grant.clientName}
              sinceLabel={t('account.assistants.since', {
                date: formatDueDate(grant.createdAt, i18n.language),
              })}
              lastUsedLabel={
                grant.lastUsedAt === null
                  ? t('account.assistants.neverUsed')
                  : t('account.assistants.lastUsed', {
                      timeAgo: formatTimeAgo(grant.lastUsedAt, nowEpochMs, i18n.language),
                    })
              }
              isRevoking={revokeGrant.isPending && revokeGrant.variables.grantId === grant.id}
              onRevoke={() => revokeGrant.mutate({ grantId: grant.id })}
            />
          ))}
        </ul>
      )}
      {revokeGrant.isError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t('account.assistants.revokeFailed')}
        </p>
      ) : null}
    </Card>
  );
}
