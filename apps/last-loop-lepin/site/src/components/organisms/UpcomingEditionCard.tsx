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

interface UpcomingEditionCardProps {
  readonly upcoming: RaceEditionDto | null;
  readonly archives: readonly RaceEditionDto[];
  readonly locale: string;
}

/**
 * The spectator screen outside race day: the next edition with a countdown to
 * the gun, and the list of editions already run.
 */
// @FollowsBlueprint organism-presentational
export function UpcomingEditionCard({ upcoming, archives, locale }: UpcomingEditionCardProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 p-6 min-h-0">
      <Card>
        <CardHeader
          title={t('spectator.next-edition-title')}
          hint={
            <span className="font-mono tabular-nums text-ink-3">{t('spectator.location')}</span>
          }
        />
        <CardBody className="flex flex-col gap-3">
          <Show when={upcoming === null}>
            <div className="text-ink-3">{t('spectator.no-announced-edition')}</div>
          </Show>
          {listPresent(upcoming).map((edition) => (
            <div key={edition.slug} className="flex flex-col gap-3">
              <strong className="text-[18px]">{edition.displayName}</strong>
              <span className="text-ink-3">
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
            <span className="font-mono tabular-nums text-ink-3">
              {t('spectator.edition-count', { count: archives.length })}
            </span>
          }
        />
        <CardBody>
          <Show when={archives.length === 0}>
            <div className="text-ink-3">{t('spectator.no-archived-edition')}</div>
          </Show>
          <ul>
            {archives.map((edition) => (
              <li key={edition.slug} className="py-2 border-b border-line-soft">
                <strong>{edition.displayName}</strong>
                <span className="ml-2 text-ink-3">
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
