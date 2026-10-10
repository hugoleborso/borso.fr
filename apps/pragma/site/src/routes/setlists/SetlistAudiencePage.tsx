/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { BackLink } from '../../components/molecules/BackLink';
import { PageHeader } from '../../components/molecules/PageHeader';
import { VotingRoundPanel } from '../../components/organisms/VotingRoundPanel';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { selectConcertSessionId } from '../../lib/setlist-index.core';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useSetlistSessions } from '../../lib/setlist-sessions.hook';

// @FollowsBlueprint route-detail-page
export function SetlistAudiencePage(): JSX.Element {
  const { t } = useTranslation();
  const { setlistId = '' } = useParams<{ setlistId: string }>();
  const setlist = useSetlist(setlistId);
  const concertSessionId = selectConcertSessionId(useSetlistSessions(setlistId));
  const setlistName = selectSetlistDisplayName(
    setlist.data?.setlist.name ?? '',
    t('setlist.untitled'),
  );

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[960px] flex flex-col">
      <div className="mb-1 sm:mb-3">
        <BackLink to={`/setlists/${setlistId}`} label={setlistName} />
      </div>
      <PageHeader crumb={setlistName} title={t('audience.panelTitle')} />
      {concertSessionId === null ? (
        <p className="text-ink-500 italic text-sm">{t('setlist.noSession')}</p>
      ) : (
        <VotingRoundPanel sessionId={concertSessionId} />
      )}
    </section>
  );
}
