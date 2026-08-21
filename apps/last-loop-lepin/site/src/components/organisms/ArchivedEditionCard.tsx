import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/api';
import {
  formatElevationMetres,
  formatKilometres,
  formatRaceDate,
} from '../../lib/formatters.utils';
import { useStandings } from '../../lib/queries/standings';
import type { RaceEditionDto } from '../../lib/race.types';
import { selectRunnerStatusKind, selectRunnerStatusLoop } from '../../lib/runner-status.utils';
import { ButtonLink } from '../atoms/ButtonLink';
import { CardBody } from '../atoms/Card';
import { MonoNote } from '../atoms/MonoNote';
import { Pill } from '../atoms/Pill';
import { Show } from '../atoms/Show';
import { formatRank } from '../molecules/leaderboard-chip.utils';
import {
  RUNNER_ROW_CLASS,
  RUNNER_ROW_DETAIL_CLASS,
  RUNNER_ROW_NAME_CLASS,
  RUNNER_ROW_RANK_CLASS,
} from './leaderboard.utils';
import { composeRunnerPath } from '../../routes/route.core';

const PODIUM_SIZE = 5;

const STATUS_KEY_BY_KIND = {
  'in-race': 'archives.still-running',
  out: 'archives.out',
} as const;

const LOOP_KEY_BY_KIND = {
  'in-race': 'common.loop-short',
  out: 'leaderboard.did-not-finish',
} as const;

interface ArchivedEditionCardProps {
  readonly edition: RaceEditionDto;
  readonly locale: string;
}

// @FollowsBlueprint organism-query-owning
export function ArchivedEditionCard({ edition, locale }: ArchivedEditionCardProps) {
  const { t } = useTranslation();
  const standings = useStandings(edition.slug);
  const ranked = standings.data?.standings.ranked ?? [];

  return (
    <CardBody className="flex flex-col gap-3 border-b border-line-soft">
      <div className="flex items-center justify-between gap-3">
        <strong>{edition.displayName}</strong>
        <span className="font-mono tabular-nums text-ink-3">
          {formatRaceDate(new Date(edition.startsAt), locale)}
        </span>
      </div>
      <MonoNote>
        {t('archives.summary', {
          distance: t('common.distance', {
            kilometres: formatKilometres(edition.gpx.distanceMeters),
          }),
          elevation: t('common.elevation-gain', {
            metres: formatElevationMetres(edition.gpx.elevationGainMeters),
          }),
        })}
      </MonoNote>
      <CardBody padding="none" className="pt-2">
        <Show when={ranked.length === 0}>
          <div className="text-ink-3">{t('archives.standings-unavailable')}</div>
        </Show>
        <ul>
          {ranked.slice(0, PODIUM_SIZE).map((entry) => {
            const statusKind = selectRunnerStatusKind(entry.status);
            return (
              <li key={entry.runner.slug} className={RUNNER_ROW_CLASS}>
                <span className={RUNNER_ROW_RANK_CLASS}>
                  {formatRank(entry.rank, t('common.ex-aequo'))}
                </span>
                <a href={composeRunnerPath(entry.runner.slug)} className={RUNNER_ROW_NAME_CLASS}>
                  {entry.runner.displayName}
                </a>
                <span className={RUNNER_ROW_DETAIL_CLASS}>
                  {t(LOOP_KEY_BY_KIND[statusKind], { loop: selectRunnerStatusLoop(entry.status) })}
                </span>
                <Pill tone={statusKind}>{t(STATUS_KEY_BY_KIND[statusKind])}</Pill>
              </li>
            );
          })}
        </ul>
      </CardBody>
      <div className="flex items-center gap-3 mt-2">
        <ButtonLink
          size="small"
          href={apiUrl(`/api/standings/${encodeURIComponent(edition.slug)}/csv`)}
        >
          {t('archives.standings-csv')}
        </ButtonLink>
        <ButtonLink
          size="small"
          href={apiUrl(`/api/standings/${encodeURIComponent(edition.slug)}/laps.csv`)}
        >
          {t('archives.laps-csv')}
        </ButtonLink>
      </div>
    </CardBody>
  );
}
