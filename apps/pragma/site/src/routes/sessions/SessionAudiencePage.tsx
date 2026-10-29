/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { VotingRoundPanel } from '../../components/organisms/VotingRoundPanel';
import { useSession } from '../../lib/queries/sessions.queries';
import { useSessionLabel } from '../../lib/session-label.hook';
import { selectMissingSessionMessageKey } from './missing-session.core';

// @FollowsBlueprint route-detail-page
export function SessionAudiencePage(): JSX.Element {
  const { t } = useTranslation();
  const labelOf = useSessionLabel();
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessionQuery = useSession(sessionId ?? '', sessionId !== undefined);
  const session = sessionQuery.data?.session ?? null;

  if (sessionQuery.isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 text-ink-soft italic text-meta">
        {t('common.loading')}
      </p>
    );
  }
  if (session === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSessionMessageKey(sessionQuery.error))}
        backTo="/sessions"
        backLabel={t('sessions.title')}
      />
    );
  }

  return (
    <section className="flex max-w-[960px] flex-col gap-3 px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: `/sessions/${session.id}`, label: labelOf(session) }}
        title={t('audience.panelTitle')}
        className="mb-0 sm:mb-0"
      />
      <VotingRoundPanel sessionId={session.id} />
    </section>
  );
}
