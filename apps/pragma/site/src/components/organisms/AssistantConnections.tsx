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
import type { BrandName } from '../atoms/BrandLogo';
import { Card } from '../atoms/Card';
import { AssistantGrantRow } from '../molecules/AssistantGrantRow';
import { InstallCommandBlock } from '../molecules/InstallCommandBlock';

interface InstallationPresentation {
  readonly label: ParseKeys;
  readonly brand: BrandName;
}

const INSTALLATION_PRESENTATION: Readonly<
  Record<AssistantInstallationId, InstallationPresentation>
> = {
  'claude-code': { label: 'account.assistants.claudeCodeLabel', brand: 'claude' },
  vibe: { label: 'account.assistants.vibeLabel', brand: 'mistral' },
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
      <h2 className="text-body text-ink m-0 mb-2">{t('account.assistants.title')}</h2>
      <ul className="list-none p-0 m-0 flex flex-col divide-y divide-rule">
        {installations.map((installation) => (
          <InstallCommandBlock
            key={installation.id}
            brand={INSTALLATION_PRESENTATION[installation.id].brand}
            label={t(INSTALLATION_PRESENTATION[installation.id].label)}
            snippet={installation.snippet}
          />
        ))}
      </ul>
      <h3 className="text-meta font-medium text-ink mt-6 mb-1">
        {t('account.assistants.connected')}
      </h3>
      {connectedGrants.length === 0 ? (
        <p className="text-meta text-ink-soft m-0">{t('account.assistants.empty')}</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col divide-y divide-rule">
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
        <p role="alert" className="mt-3 text-meta text-danger">
          {t('account.assistants.revokeFailed')}
        </p>
      ) : null}
    </Card>
  );
}
