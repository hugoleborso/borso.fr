/** @Feature concert-registrations */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { PragmaMark } from '../../components/atoms/PragmaMark';
import { EmptyState } from '../../components/molecules/EmptyState';
import { ConcertSignUpCard } from '../../components/organisms/ConcertSignUpCard';
import { readInstallContext } from '../../lib/display-mode.adapter';
import { useUpcomingConcerts } from '../../lib/queries/concert-registrations.queries';
import { DEFAULT_POST_LOGIN_PATH } from '../login.core';

function NextConcert(): JSX.Element {
  const { t } = useTranslation();
  const upcoming = useUpcomingConcerts();
  if (upcoming.isPending) {
    return <p className="m-0 text-meta italic text-ink-soft">{t('common.loading')}</p>;
  }
  if (upcoming.isError) {
    return (
      <EmptyState
        icon="warn"
        action={
          <Button icon="refresh" variant="secondary" onClick={() => void upcoming.refetch()}>
            {t('audience.refresh')}
          </Button>
        }
      >
        {t('concerts.loadFailed')}
      </EmptyState>
    );
  }
  const [nextConcert] = upcoming.data.concerts;
  if (nextConcert === undefined) {
    return <EmptyState icon="calendar">{t('concerts.empty')}</EmptyState>;
  }
  return <ConcertSignUpCard key={nextConcert.sessionId} concert={nextConcert} />;
}

// @FollowsBlueprint route-list-page
export function ConcertsLandingPage(): JSX.Element {
  const { t } = useTranslation();
  const isInstalledApp = readInstallContext().isStandalone;
  if (isInstalledApp) return <Navigate to={DEFAULT_POST_LOGIN_PATH} replace />;
  return (
    <main className="flex min-h-dvh flex-col bg-paper px-4 pt-3.5 pb-28 md:px-12 md:pt-5 md:pb-12">
      <header>
        <PragmaMark motion="still" className="w-11 md:w-14.5" />
        <h1 className="sr-only">{t('concerts.pageTitle')}</h1>
      </header>
      <div className="mt-4 flex flex-auto flex-col md:mt-8 md:items-center md:justify-center">
        <NextConcert />
      </div>
    </main>
  );
}
