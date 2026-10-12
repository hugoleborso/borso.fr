/** @Feature studies */

import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import { countReadySongs, readyShareInPercent } from '../../routes/studies/studies-page.core';
import { Chip } from '../atoms/Chip';

export interface ConcertReadinessBarProps {
  date: string;
  venue: string | null;
  songs: readonly { songId: string; title: string; isReady: boolean }[];
}

// @FollowsBlueprint organism-presentational
export function ConcertReadinessBar({ date, venue, songs }: ConcertReadinessBarProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const count = countReadySongs(songs);
  const { ready, total } = count;
  const share = readyShareInPercent(count);
  const notReady = songs.filter((song) => !song.isReady);
  return (
    <section className="flex flex-col gap-2" data-testid="concert-readiness">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-ink-900">{t('studies.readyCount', { ready, total })}</span>
        <span className="text-xs text-ink-500 truncate">
          {formatSessionDate(date, i18n.language)}
          {venue === null ? '' : ` · ${venue}`}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-line overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ready}
        aria-label={t('studies.readinessLabel')}
      >
        <div className="h-full bg-accent" style={{ width: `${share}%` }} />
      </div>
      {notReady.length > 0 ? (
        <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
          {notReady.map((song) => (
            <li key={song.songId}>
              <Chip>{song.title}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
