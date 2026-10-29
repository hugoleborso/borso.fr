/** @Feature sessions */

import { type JSX, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { buildSetlistPreview } from '../../routes/sessions/session-page.core';
import { AlbumCover } from '../atoms/AlbumCover';
import { Icon } from '../atoms/Icon';
import { LineupSlots } from '../molecules/LineupSlots';
import { buildLineupColumn } from '../molecules/lineup-slots.core';
import { Menu, type MenuItem } from '../molecules/Menu';
import { describeTotalDuration } from '../molecules/song-duration.utils';
import { joinSummaryItems } from '../molecules/summary-line.utils';
import { indexById } from './setlist-editor.utils';

export interface SessionSetlistPreviewProps {
  readonly setlistId: string;
  readonly setlistName: string;
  readonly menuItems: readonly MenuItem[];
}

const NO_ROWS: readonly never[] = [];
const TOTAL_DURATION_KEY = {
  minutes: 'home.totalMinutes',
  hoursMinutes: 'home.totalHoursMinutes',
} as const;

// @FollowsBlueprint organism-query-owning
export function SessionSetlistPreview({
  setlistId,
  setlistName,
  menuItems,
}: SessionSetlistPreviewProps): JSX.Element {
  const { t } = useTranslation();
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();

  const songsById = useMemo(() => indexById(songsQuery.data?.songs ?? NO_ROWS), [songsQuery.data]);
  const preview = useMemo(
    () => buildSetlistPreview(entriesQuery.data?.entries ?? NO_ROWS, songsById),
    [entriesQuery.data, songsById],
  );
  const members = membersQuery.data?.members ?? NO_ROWS;
  const instruments = instrumentsQuery.data?.instruments ?? NO_ROWS;
  const total = preview.totalSeconds === null ? null : describeTotalDuration(preview.totalSeconds);
  const summary = joinSummaryItems([
    t('setlist.songCount', { count: preview.songCount }),
    total === null
      ? null
      : t(TOTAL_DURATION_KEY[total.kind], { hours: total.hours, minutes: total.minutes }),
  ]);

  return (
    <section className="flex flex-col rounded-md bg-leaf shadow-leaf" aria-label={setlistName}>
      <div className="flex items-center gap-1 pl-4">
        <Link
          to={`/setlists/${setlistId}`}
          className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-2 text-ink no-underline"
        >
          <span className="truncate font-display text-title">{setlistName}</span>
          <span className="text-meta text-ink-soft">{summary}</span>
        </Link>
        <Menu label={t('sessions.setlistActions', { name: setlistName })} items={menuItems} />
      </div>
      {preview.rows.length === 0 ? null : (
        <ul className="m-0 flex list-none flex-col divide-y divide-rule border-t border-rule p-0">
          {preview.rows.map((row) => (
            <li key={row.entryId} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <AlbumCover title={row.title} deezerAlbumId={row.deezerAlbumId} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-display text-body text-ink">{row.title}</span>
                {row.hasNoLineup ? (
                  <span className="flex items-center gap-1 text-label text-warn">
                    <Icon name="warn" />
                    {t('sessions.noLineup')}
                  </span>
                ) : (
                  <LineupSlots
                    column={buildLineupColumn({ instruments, lineup: row.lineup, members })}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
