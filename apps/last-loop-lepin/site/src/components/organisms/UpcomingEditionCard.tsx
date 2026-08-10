import { useTranslation } from 'react-i18next';
import {
  formatElevationMetres,
  formatKilometres,
  formatRaceDate,
} from '../../lib/formatters.utils';
import { listPresent } from '../../lib/optional.utils';
import type { RaceEditionDto } from '../../lib/race.types';
import { Card, CardBody } from '../atoms/Card';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import { Countdown } from '../molecules/Countdown';
import { selectDistanceLabelKey } from './upcoming-edition.core';

const TITLE_STYLE = { fontSize: 18 } as const;
const LIST_STYLE = { listStyle: 'none', padding: 0, margin: 0 } as const;
const ARCHIVE_ROW_STYLE = { padding: '8px 0', borderBottom: '1px solid var(--line-soft)' } as const;
const ARCHIVE_DATE_STYLE = { marginLeft: 8 } as const;

interface UpcomingEditionCardProps {
  readonly upcoming: RaceEditionDto | null;
  readonly archives: readonly RaceEditionDto[];
  readonly locale: string;
}

/**
 * The spectator screen outside race day: the next edition with a countdown to
 * the gun, and the list of editions already run.
 */
export function UpcomingEditionCard({ upcoming, archives, locale }: UpcomingEditionCardProps) {
  const { t } = useTranslation();
  return (
    <div className="main col">
      <Card>
        <CardHeader
          title={t('spectator.next-edition-title')}
          hint={<span className="muted mono">{t('spectator.location')}</span>}
        />
        <CardBody modifier="col">
          <Show when={upcoming === null}>
            <div className="muted">{t('spectator.no-announced-edition')}</div>
          </Show>
          {listPresent(upcoming).map((edition) => (
            <div key={edition.slug} className="col">
              <strong style={TITLE_STYLE}>{edition.displayName}</strong>
              <span className="muted">
                {t('spectator.start-line', {
                  date: formatRaceDate(new Date(edition.startsAt), locale),
                  distance: t(selectDistanceLabelKey(edition), {
                    kilometres: formatKilometres(edition.gpx.distanceMeters),
                  }),
                  elevation: t('common.elevation-gain', {
                    metres: formatElevationMetres(edition.gpx.elevationGainMeters),
                  }),
                })}
              </span>
              <Countdown
                targetEpochMs={new Date(edition.startsAt).getTime()}
                label={t('spectator.countdown-to-start')}
              />
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title={t('spectator.archives-title')}
          hint={
            <span className="muted mono">
              {t('spectator.edition-count', { count: archives.length })}
            </span>
          }
        />
        <CardBody>
          <Show when={archives.length === 0}>
            <div className="muted">{t('spectator.no-archived-edition')}</div>
          </Show>
          <ul style={LIST_STYLE}>
            {archives.map((edition) => (
              <li key={edition.slug} style={ARCHIVE_ROW_STYLE}>
                <strong>{edition.displayName}</strong>
                <span className="muted" style={ARCHIVE_DATE_STYLE}>
                  {formatRaceDate(new Date(edition.startsAt), locale)}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
