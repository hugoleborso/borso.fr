/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import {
  type ConsentDecision,
  useConsentDescription,
  useDecideConsent,
} from '../../lib/queries/assistant-grants.queries';
import {
  type ConsentAuthorizationQuery,
  readAuthorizationQuery,
  selectConsentView,
} from './consent.core';

interface ConsentQuestionProps {
  readonly query: ConsentAuthorizationQuery;
  readonly clientName: string;
  readonly memberFirstName: string;
}

function ConsentQuestion(props: ConsentQuestionProps): JSX.Element {
  const { t } = useTranslation();
  const decideConsent = useDecideConsent();
  const decide = (decision: ConsentDecision): void => {
    decideConsent.mutate({ query: props.query, decision });
  };
  return (
    <>
      <p className="text-body text-ink m-0 mb-2">
        {t('consent.question', {
          clientName: props.clientName,
          memberFirstName: props.memberFirstName,
        })}
      </p>
      <p className="text-meta text-ink-soft m-0 mb-6">{t('consent.scope')}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="quiet"
          icon="close"
          disabled={decideConsent.isPending}
          onClick={() => decide('deny')}
        >
          {t('consent.deny')}
        </Button>
        <Button
          type="button"
          variant="primary"
          icon="check"
          disabled={decideConsent.isPending}
          onClick={() => decide('allow')}
        >
          {t('consent.allow')}
        </Button>
      </div>
      {decideConsent.isError ? (
        <p role="alert" className="mt-3 text-meta text-danger">
          {t('consent.failed')}
        </p>
      ) : null}
    </>
  );
}

// @FollowsBlueprint route-detail-page
export function ConsentPage(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const query = readAuthorizationQuery(location.search);
  const description = useConsentDescription(query, location.search);
  const view = selectConsentView(description);

  const VIEW_BY_CONSENT_STATE = {
    loading: () => <p className="text-meta text-ink-soft m-0">{t('common.loading')}</p>,
    invalid: () => (
      <p role="alert" className="text-meta text-danger m-0">
        {t('consent.invalid')}
      </p>
    ),
    ready: () => (
      <ConsentQuestion
        query={query}
        clientName={description.data?.clientName ?? ''}
        memberFirstName={description.data?.memberFirstName ?? ''}
      />
    ),
  } as const;
  const View = VIEW_BY_CONSENT_STATE[view];

  return (
    <main className="min-h-dvh flex items-center justify-center bg-paper px-4 py-8">
      <Card className="w-full max-w-[480px] p-6 sm:p-8">
        <p className="text-label tracking-[0.18em] uppercase text-ink-soft m-0 mb-2">
          {t('appName')}
        </p>
        <h1 className="font-display text-display leading-none tracking-[-0.015em] text-ink m-0 mb-5">
          {t('consent.title')}
        </h1>
        <View />
      </Card>
    </main>
  );
}
