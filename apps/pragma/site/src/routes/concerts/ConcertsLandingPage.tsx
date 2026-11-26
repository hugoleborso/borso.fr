/** @Feature concert-registrations */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { PragmaMark } from '../../components/atoms/PragmaMark';
import { EmptyState } from '../../components/molecules/EmptyState';
import { ConcertSignUpCard } from '../../components/organisms/ConcertSignUpCard';
import { useUpcomingConcerts } from '../../lib/queries/concert-registrations.queries';

const MEMBERS_SPACE_PATH = '/app';

function UpcomingConcerts(): JSX.Element {
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
  if (upcoming.data.concerts.length === 0) {
    return <EmptyState icon="calendar">{t('concerts.empty')}</EmptyState>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-6 p-0">
      {upcoming.data.concerts.map((concert) => (
        <li key={concert.sessionId}>
          <ConcertSignUpCard concert={concert} />
        </li>
      ))}
    </ul>
  );
}

// @FollowsBlueprint route-list-page
export function ConcertsLandingPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <main className="min-h-dvh bg-paper px-4 pt-8 pb-12 sm:px-8 sm:pt-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <PragmaMark motion="still" className="w-20 sm:w-24" />
          <h1 className="m-0 font-display text-display text-ink">{t('concerts.pageTitle')}</h1>
          <p className="m-0 max-w-md text-body text-ink-soft text-balance">
            {t('concerts.pageIntro')}
          </p>
        </header>
        <UpcomingConcerts />
        <footer className="flex justify-center pt-4">
          <Link
            to={MEMBERS_SPACE_PATH}
            className="text-meta text-ink-faint underline-offset-4 hover:text-ink-soft hover:underline"
          >
            {t('concerts.membersSpace')}
          </Link>
        </footer>
      </div>
    </main>
  );
}
