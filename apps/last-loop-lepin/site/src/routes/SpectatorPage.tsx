import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CorrectionBanner } from '../components/molecules/CorrectionBanner';
import { Countdown } from '../components/molecules/Countdown';
import { InRaceCounter } from '../components/molecules/InRaceCounter';
import { CourseMap } from '../components/organisms/CourseMap';
import { ElevationProfile } from '../components/organisms/ElevationProfile';
import { Leaderboard } from '../components/organisms/Leaderboard';
import { SelfPunchModal } from '../components/organisms/SelfPunchModal';
import {
  collectFastestLapSlugs,
  isRaceOver,
  isShowingAnnouncement,
  listFinishedEditions,
  projectNextLoopBoundaryMs,
  readCorrectionInstant,
  selectRacingEdition,
} from '../components/organisms/spectator.core';
import { UpcomingEditionCard } from '../components/organisms/UpcomingEditionCard';
import { Card, CardBody } from '../components/atoms/Card';
import { Show } from '../components/atoms/Show';
import { CardHeader } from '../components/molecules/CardHeader';
import { apiUrl } from '../lib/api';
import { formatElevationMetres } from '../lib/formatters.utils';
import { listPresent } from '../lib/optional.utils';
import { useCurrentEdition, useEditionList } from '../lib/queries/editions';
import { useStandings } from '../lib/queries/standings';
import type { RankedRunnerDto } from '../lib/race.types';
import { countRunnersInRace } from '../lib/runner-status.utils';

const BANNER_STYLE = { justifyContent: 'space-between' } as const;
const EMPTY_RANKED: readonly RankedRunnerDto[] = [];
const EMPTY_FASTEST_LAP: readonly { readonly runnerSlug: string }[] = [];

/** The public race screen: countdown, track, standings, elevation profile. */
export function SpectatorPage() {
  const { t, i18n } = useTranslation();
  const currentEdition = useCurrentEdition();
  const editionList = useEditionList();
  const edition = currentEdition.data?.edition ?? null;
  const standings = useStandings(edition?.slug ?? '');
  const [selectedRunner, setSelectedRunner] = useState<RankedRunnerDto | null>(null);

  const ranked = standings.data?.standings.ranked ?? EMPTY_RANKED;

  return (
    <>
      <Show when={currentEdition.isError}>
        <div className="main">
          <Card>
            <CardBody modifier="error-text">{t('spectator.server-unreachable')}</CardBody>
          </Card>
        </div>
      </Show>
      <Show when={isShowingAnnouncement(currentEdition.isError, edition)}>
        <UpcomingEditionCard
          upcoming={edition}
          archives={listFinishedEditions(editionList.data?.editions ?? [])}
          locale={i18n.language}
        />
      </Show>
      {listPresent(selectRacingEdition(edition)).map((raceEdition) => (
        <div className="main" key={raceEdition.slug}>
          <Show when={isRaceOver(raceEdition, standings.data?.standings.raceEnded === true)}>
            <div className="banner row" style={BANNER_STYLE}>
              <span>{t('spectator.race-over')}</span>
              <a
                className="btn btn-sm"
                href={apiUrl(`/api/standings/${encodeURIComponent(raceEdition.slug)}/csv`)}
              >
                {t('spectator.download-standings-csv')}
              </a>
            </div>
          </Show>
          <CorrectionBanner
            correctedAt={readCorrectionInstant(standings.data?.mostRecentCorrectionAt ?? null)}
          />
          <div className="spectator-layout">
            <Card modifier="countdown-card">
              <CardHeader
                title={t('spectator.next-top-title')}
                hint={<span className="muted mono">{raceEdition.displayName}</span>}
              />
              <CardBody modifier="col">
                <Countdown
                  targetEpochMs={projectNextLoopBoundaryMs(raceEdition, Date.now())}
                  label=""
                />
                <InRaceCounter ranked={ranked} />
              </CardBody>
            </Card>
            <Card modifier="map-card">
              <CardHeader
                title={t('spectator.track-title')}
                hint={
                  <span className="muted mono">
                    {t('spectator.in-race-count', { runners: countRunnersInRace(ranked) })}
                  </span>
                }
              />
              <CourseMap edition={raceEdition} ranked={ranked} now={new Date()} />
            </Card>
            <Card modifier="classement-card">
              <CardHeader
                title={t('spectator.standings-title')}
                hint={
                  <Show when={raceEdition.status === 'live'}>
                    <span className="live-pill">{t('spectator.live')}</span>
                  </Show>
                }
              />
              <CardBody modifier="flush">
                <Leaderboard
                  ranked={ranked}
                  fastestLapSlugs={collectFastestLapSlugs(
                    standings.data?.standings.fastestLap ?? EMPTY_FASTEST_LAP,
                  )}
                  onChipSelect={setSelectedRunner}
                  locale={i18n.language}
                />
              </CardBody>
            </Card>
            <Card modifier="profile-card">
              <CardHeader
                title={t('spectator.elevation-title')}
                hint={
                  <span className="muted mono">
                    {t('common.elevation-gain', {
                      metres: formatElevationMetres(raceEdition.gpx.elevationGainMeters),
                    })}
                  </span>
                }
              />
              <ElevationProfile edition={raceEdition} ranked={ranked} now={new Date()} />
            </Card>
          </div>
          {listPresent(selectedRunner).map((runner) => (
            <SelfPunchModal
              key={runner.runner.slug}
              runner={runner}
              editionSlug={raceEdition.slug}
              onClose={() => {
                setSelectedRunner(null);
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}
