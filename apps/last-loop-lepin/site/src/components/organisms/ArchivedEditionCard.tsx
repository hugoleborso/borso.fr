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
import { CardBody } from '../atoms/Card';
import { Pill } from '../atoms/Pill';
import { Show } from '../atoms/Show';
import { formatRank } from '../molecules/leaderboard-chip.utils';
import { composeRunnerPath } from '../../routes/route.core';

const PODIUM_SIZE = 5;
const CARD_STYLE = { borderBottom: '1px solid var(--line-soft)' } as const;
const HEAD_ROW_STYLE = { justifyContent: 'space-between' } as const;
const SUMMARY_STYLE = { fontSize: 11 } as const;
const PODIUM_STYLE = { paddingTop: 'var(--d-2)' } as const;
const LIST_STYLE = { listStyle: 'none', padding: 0, margin: 0 } as const;
const DOWNLOADS_STYLE = { gap: 'var(--d-3)', marginTop: 'var(--d-2)' } as const;

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

/** One finished edition: its headline numbers, its podium, and its exports. */
// @FollowsBlueprint organism-query-owning
export function ArchivedEditionCard({ edition, locale }: ArchivedEditionCardProps) {
  const { t } = useTranslation();
  const standings = useStandings(edition.slug);
  const ranked = standings.data?.standings.ranked ?? [];

  return (
    <CardBody modifier="col" style={CARD_STYLE}>
      <div className="row" style={HEAD_ROW_STYLE}>
        <strong>{edition.displayName}</strong>
        <span className="muted mono">{formatRaceDate(new Date(edition.startsAt), locale)}</span>
      </div>
      <div className="muted mono" style={SUMMARY_STYLE}>
        {t('archives.summary', {
          distance: t('common.distance', {
            kilometres: formatKilometres(edition.gpx.distanceMeters),
          }),
          elevation: t('common.elevation-gain', {
            metres: formatElevationMetres(edition.gpx.elevationGainMeters),
          }),
        })}
      </div>
      <CardBody modifier="flush" style={PODIUM_STYLE}>
        <Show when={ranked.length === 0}>
          <div className="muted">{t('archives.standings-unavailable')}</div>
        </Show>
        <ul style={LIST_STYLE}>
          {ranked.slice(0, PODIUM_SIZE).map((entry) => {
            const statusKind = selectRunnerStatusKind(entry.status);
            return (
              <li key={entry.runner.slug} className="leaderboard-row">
                <span className="rank mono">{formatRank(entry.rank, t('common.ex-aequo'))}</span>
                <a href={composeRunnerPath(entry.runner.slug)} className="runner-name">
                  {entry.runner.displayName}
                </a>
                <span className="loop-info">
                  {t(LOOP_KEY_BY_KIND[statusKind], { loop: selectRunnerStatusLoop(entry.status) })}
                </span>
                <Pill tone={statusKind}>{t(STATUS_KEY_BY_KIND[statusKind])}</Pill>
              </li>
            );
          })}
        </ul>
      </CardBody>
      <div className="row" style={DOWNLOADS_STYLE}>
        <a
          className="btn btn-sm"
          href={apiUrl(`/api/standings/${encodeURIComponent(edition.slug)}/csv`)}
        >
          {t('archives.standings-csv')}
        </a>
        <a
          className="btn btn-sm"
          href={apiUrl(`/api/standings/${encodeURIComponent(edition.slug)}/laps.csv`)}
        >
          {t('archives.laps-csv')}
        </a>
      </div>
    </CardBody>
  );
}
