/** @Feature setlists */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { IconButton } from '../../components/atoms/IconButton';
import { BackLink } from '../../components/molecules/BackLink';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { VoteEntryLink } from '../../components/molecules/VoteEntryLink';
import { resolveSetlistStatus } from '@domain/setlist-vote.core';
import { SetlistEditor } from '../../components/organisms/SetlistEditor';
import { SetlistHeaderActions } from '../../components/organisms/SetlistHeaderActions';
import { formatSessionDate } from '../../lib/formatters.utils';
import { MEMBER_FILTER_PARAM } from '../../lib/next-concert.core';
import {
  isEnergyCurveShownIn,
  didStoreEnergyCurveChoice,
} from '../../lib/energy-curve-preference.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { selectConcertSessionId } from '../../lib/setlist-index.core';
import { useSetlistSessions } from '../../lib/setlist-sessions.hook';
import { AudienceVoteLink } from '../../components/molecules/AudienceVoteLink';

// @FollowsBlueprint route-detail-page
export function SetlistEditorPage(): JSX.Element {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { t } = useTranslation();
  if (setlistId === undefined) {
    return <p className="px-4 sm:px-9 py-4 sm:py-7 text-danger">{t('setlist.missingId')}</p>;
  }
  return <SetlistDetail setlistId={setlistId} />;
}

function SetlistDetail({ setlistId }: { setlistId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const setlistQuery = useSetlist(setlistId);
  const [searchParams] = useSearchParams();
  const [isEnergyShown, setIsEnergyShown] = useState(() =>
    isEnergyCurveShownIn(window.localStorage),
  );
  const toggleEnergyCurve = (): void => {
    didStoreEnergyCurveChoice(window.localStorage, !isEnergyShown);
    setIsEnergyShown(!isEnergyShown);
  };
  const setlist = setlistQuery.data?.setlist ?? null;
  const sessions = useSetlistSessions(setlistId);

  if (setlistQuery.isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 italic text-ink-soft text-meta">
        {t('common.loading')}
      </p>
    );
  }

  if (setlist === null) {
    return (
      <NotFoundNotice
        message={t('setlist.notFound')}
        backTo="/setlists"
        backLabel={t('setlist.title')}
      />
    );
  }

  const displayedName = selectSetlistDisplayName(setlist.name, t('setlist.untitled'));

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1 sm:mb-3">
        <BackLink to="/setlists" label={t('setlist.title')} />
        <SetlistHeaderActions
          setlistId={setlistId}
          name={setlist.name}
          displayedName={displayedName}
          onDeleted={() => navigateTo('/setlists')}
          trailing={
            <>
              <IconButton
                icon="chart"
                label={t('setlist.energy')}
                aria-pressed={isEnergyShown}
                onClick={toggleEnergyCurve}
              />
              {selectConcertSessionId(sessions) === null ? null : (
                <AudienceVoteLink setlistId={setlist.id} />
              )}
              <VoteEntryLink setlistId={setlist.id} status={resolveSetlistStatus(setlist.status)} />
            </>
          }
        />
      </div>
      <PageHeader
        crumb={t('setlist.crumb')}
        title={displayedName}
        subtitle={
          sessions.length === 0
            ? t('setlist.noSession')
            : `${t('setlist.playedIn')} ${sessions
                .map((session) => session.venue ?? formatSessionDate(session.date, i18n.language))
                .join(' · ')}`
        }
      />

      <SetlistEditor
        setlistId={setlist.id}
        initialMemberId={searchParams.get(MEMBER_FILTER_PARAM)}
        isEnergyShown={isEnergyShown}
      />
    </section>
  );
}
