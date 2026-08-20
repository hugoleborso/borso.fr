import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../clock-store';
import { CorrectionBanner } from '../components/molecules/CorrectionBanner';
import { InRaceCounter } from '../components/molecules/InRaceCounter';
import { CourseMap } from '../components/organisms/CourseMap';
import { ElevationProfile } from '../components/organisms/ElevationProfile';
import { Leaderboard } from '../components/organisms/Leaderboard';
import { NextLoopCountdown } from '../components/organisms/NextLoopCountdown';
import { SelfPunchModal } from '../components/organisms/SelfPunchModal';
import {
  collectFastestLapSlugs,
  isRaceOver,
  isShowingAnnouncement,
  listFinishedEditions,
  readCorrectionInstant,
  selectRacingEdition,
} from '../components/organisms/spectator.core';
import { UpcomingEditionCard } from '../components/organisms/UpcomingEditionCard';
import { ButtonLink } from '../components/atoms/ButtonLink';
import { Card, CardBody } from '../components/atoms/Card';
import { Show } from '../components/atoms/Show';
import { CardHeader } from '../components/atoms/CardHeader';
import { apiUrl } from '../lib/api';
import { formatElevationMetres } from '../lib/formatters.utils';
import { listPresent } from '../lib/optional.utils';
import { useCurrentEdition, useEditionList } from '../lib/queries/editions';
import { useStandings } from '../lib/queries/standings';
import type { RankedRunnerDto } from '../lib/race.types';
import { countRunnersInRace } from '../lib/runner-status.utils';

const EMPTY_RANKED: readonly RankedRunnerDto[] = [];
const EMPTY_FASTEST_LAP: readonly { readonly runnerSlug: string }[] = [];

const SPECTATOR_GRID_CLASS =
  'grid grid-cols-[minmax(0,1fr)] gap-4 flex-initial min-h-0 min-[901px]:grid-cols-[minmax(280px,2fr)_minmax(0,1fr)] min-[901px]:grid-rows-[auto_1fr] min-[901px]:flex-1';

// @FollowsBlueprint route-list-page
export function SpectatorPage() {
  const { t, i18n } = useTranslation();
  const currentEdition = useCurrentEdition();
  const editionList = useEditionList();
  const edition = currentEdition.data?.edition ?? null;
  const standings = useStandings(edition?.slug ?? '');
  const [selectedRunner, setSelectedRunner] = useState<RankedRunnerDto | null>(null);
  const nowMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const now = new Date(nowMs);

  const ranked = standings.data?.standings.ranked ?? EMPTY_RANKED;

  return (
    <>
      <Show when={currentEdition.isError}>
        <div className="flex flex-col gap-4 p-6 min-h-0">
          <Card>
            <CardBody className="font-mono text-[12px] text-danger">
              {t('spectator.server-unreachable')}
            </CardBody>
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
        <div className="flex flex-col gap-4 p-6 min-h-0" key={raceEdition.slug}>
          <Show when={isRaceOver(raceEdition, standings.data?.standings.raceEnded === true)}>
            <div className="flex items-center justify-between gap-3 px-5 py-3 text-center font-mono text-[12px] bg-warn/20 text-warn border-b border-warn/40">
              <span>{t('spectator.race-over')}</span>
              <ButtonLink
                size="small"
                href={apiUrl(`/api/standings/${encodeURIComponent(raceEdition.slug)}/csv`)}
              >
                {t('spectator.download-standings-csv')}
              </ButtonLink>
            </div>
          </Show>
          <CorrectionBanner
            correctedAt={readCorrectionInstant(standings.data?.mostRecentCorrectionAt ?? null)}
          />
          <div className={SPECTATOR_GRID_CLASS}>
            <Card>
              <CardHeader
                title={t('spectator.next-top-title')}
                hint={
                  <span className="font-mono tabular-nums text-ink-3">
                    {raceEdition.displayName}
                  </span>
                }
              />
              <CardBody className="flex flex-col gap-3">
                <NextLoopCountdown edition={raceEdition} label="" />
                <InRaceCounter ranked={ranked} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title={t('spectator.track-title')}
                hint={
                  <span className="font-mono tabular-nums text-ink-3">
                    {t('spectator.in-race-count', { runners: countRunnersInRace(ranked) })}
                  </span>
                }
              />
              <CourseMap edition={raceEdition} ranked={ranked} now={now} />
            </Card>
            <Card className="order-4 min-h-0 min-[901px]:order-0">
              <CardHeader
                title={t('spectator.standings-title')}
                hint={
                  <Show when={raceEdition.status === 'live'}>
                    <span className="inline-flex items-center gap-2 py-[5px] pl-2 pr-2.5 rounded-full border border-accent/35 bg-accent/14 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent before:content-[''] before:w-[7px] before:h-[7px] before:rounded-full before:bg-accent before:animate-live-pulse">
                      {t('spectator.live')}
                    </span>
                  </Show>
                }
              />
              <CardBody padding="none">
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
            <Card className="order-3 min-h-0 min-[901px]:order-0">
              <CardHeader
                title={t('spectator.elevation-title')}
                hint={
                  <span className="font-mono tabular-nums text-ink-3">
                    {t('common.elevation-gain', {
                      metres: formatElevationMetres(raceEdition.gpx.elevationGainMeters),
                    })}
                  </span>
                }
              />
              <ElevationProfile edition={raceEdition} ranked={ranked} now={now} />
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
