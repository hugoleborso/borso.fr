/** @Feature studies */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/molecules/PageHeader';
import { StreakBadge } from '../../components/molecules/StreakBadge';
import { BandStreaks } from '../../components/organisms/BandStreaks';
import { ConcertReadinessBar } from '../../components/organisms/ConcertReadinessBar';
import { StudyQueue } from '../../components/organisms/StudyQueue';
import { ApiError } from '../../lib/api.client';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useStudiesOverview } from '../../lib/queries/studies.queries';
import { indexInstrumentNames } from './studies-page.core';

const SECTION_TITLE_CLASS = 'text-[11px] uppercase tracking-[0.08em] text-ink-500 mb-2';

// @FollowsBlueprint route-list-page
export function StudiesPage(): JSX.Element {
  const { t } = useTranslation();
  const overviewQuery = useStudiesOverview();
  const memberQuery = useSignedInMember();
  const instrumentsQuery = useInstrumentsList();

  const firstError = overviewQuery.error ?? memberQuery.error ?? instrumentsQuery.error;
  const errorMessage =
    firstError instanceof ApiError ? firstError.message : firstError ? 'unknown-error' : null;
  const isLoading = overviewQuery.isLoading || memberQuery.isLoading || instrumentsQuery.isLoading;

  const instrumentNames = useMemo(
    () => indexInstrumentNames(instrumentsQuery.data?.instruments ?? []),
    [instrumentsQuery.data],
  );
  const overview = overviewQuery.data;
  const memberId = memberQuery.data?.memberId ?? null;

  return (
    <div className="px-4 py-4 sm:px-8 sm:py-6 max-w-3xl">
      <PageHeader title={t('studies.title')} subtitle={t('studies.subtitle')} />
      {errorMessage === null ? null : <p className="text-sm text-danger">{errorMessage}</p>}
      {isLoading || overview === undefined || memberId === null ? (
        <p className="text-sm text-ink-400">…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <StreakBadge {...overview.myStreak} size="large" />
          <section>
            <h2 className={SECTION_TITLE_CLASS}>
              {overview.readiness === null
                ? t('studies.queueCatalogue')
                : t('studies.queueConcert')}
            </h2>
            <StudyQueue
              memberId={memberId}
              rows={overview.queue}
              instrumentNames={instrumentNames}
            />
          </section>
          <section>
            <h2 className={SECTION_TITLE_CLASS}>{t('studies.bandTitle')}</h2>
            <BandStreaks members={overview.band} />
          </section>
          <section>
            <h2 className={SECTION_TITLE_CLASS}>{t('studies.readinessTitle')}</h2>
            {overview.readiness === null ? (
              <p className="text-sm text-ink-500 italic">{t('studies.noConcert')}</p>
            ) : (
              <ConcertReadinessBar
                date={overview.readiness.date}
                venue={overview.readiness.venue}
                songs={overview.readiness.songs}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
