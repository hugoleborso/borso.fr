/** @Feature sessions */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useSavePracticeSongs } from '../../lib/queries/practice-songs.queries';
import { type SetlistSummary, useSetlistsList } from '../../lib/queries/setlists.queries';
import {
  listPickableConcerts,
  listPickableSetlists,
  listPickableSongIds,
  type PooledSetlist,
  planPracticeSongsSave,
  poolPickedSongIds,
  togglePickedId,
} from '../../routes/sessions/practice-songs.core';
import { AlbumCover } from '../atoms/AlbumCover';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { CheckableRow } from '../molecules/CheckableRow';
import { Sheet } from '../molecules/Sheet';
import type { PracticeListedSong } from './PracticeSongList';
import type { PracticeSongs } from './practice-songs.hook';

export interface PracticeSongsConcert {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly venue: string | null;
}

export interface PracticeSongsSheetProps {
  readonly practice: { readonly id: string; readonly preparedConcertId?: string | null };
  readonly setlistName: string;
  readonly sessions: readonly PracticeSongsConcert[];
  readonly practiceSetlists: readonly PooledSetlist[];
  readonly practiceSongs: PracticeSongs<PracticeListedSong>;
  readonly onClose: () => void;
}

type PracticeSongsStep = 'sources' | 'songs';

const SECTION_TITLE_CLASS =
  'm-0 px-1 pt-3 pb-1 text-label font-medium tracking-wider text-ink-soft uppercase';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function PracticeSongsSheet(props: PracticeSongsSheetProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const setlistsQuery = useSetlistsList();
  const saveSongs = useSavePracticeSongs();
  const [step, setStep] = useState<PracticeSongsStep>('sources');
  const [query, setQuery] = useState('');
  const { songIds: practiceSongIds, songsById, entriesBySetlistId } = props.practiceSongs;
  const preparedConcertId = props.practice.preparedConcertId ?? null;
  const [pickedConcertIds, setPickedConcertIds] = useState<readonly string[]>(
    preparedConcertId === null ? NO_ROWS : [preparedConcertId],
  );
  const [pickedSetlistIds, setPickedSetlistIds] = useState<readonly string[]>(NO_ROWS);
  const [tickedSongIds, setTickedSongIds] = useState<readonly string[]>(practiceSongIds);

  const dateOf = (concert: PracticeSongsConcert): string =>
    formatSessionDate(concert.date, i18n.language);
  const concerts = listPickableConcerts(
    props.sessions,
    query,
    (concert) => `${concert.venue ?? ''} ${dateOf(concert)}`,
  );
  const allSetlists = setlistsQuery.data?.setlists ?? NO_ROWS;
  const labelOfSetlist = (setlist: SetlistSummary): string =>
    selectSetlistDisplayName(setlist.name, t('setlist.untitled'));
  const setlists = listPickableSetlists(allSetlists, props.practice.id, query, labelOfSetlist);
  const pooledSongIds = poolPickedSongIds(
    { concertIds: pickedConcertIds, setlistIds: pickedSetlistIds },
    allSetlists,
  );
  const songIds = listPickableSongIds(pooledSongIds, practiceSongIds).filter(
    (songId) => songsById[songId] !== undefined,
  );
  const title = t(
    step === 'sources'
      ? 'sessions.practiceSongs.sourcesTitle'
      : 'sessions.practiceSongs.songsTitle',
  );

  const save = (): void => {
    saveSongs.mutate(
      {
        practiceId: props.practice.id,
        setlistName: props.setlistName,
        plan: planPracticeSongsSave({
          practiceId: props.practice.id,
          practiceSetlists: props.practiceSetlists,
          entriesBySetlistId,
          tickedSongIds,
        }),
      },
      { onSuccess: props.onClose },
    );
  };

  const sourcesStep = {
    subheader: (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
          <Icon name="search" />
        </span>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('sessions.practiceSongs.search')}
          aria-label={t('sessions.practiceSongs.search')}
          className="pl-9"
        />
      </div>
    ),
    footer: (
      <Button variant="primary" icon="chevR" size="lg" onClick={() => setStep('songs')}>
        {t('sessions.practiceSongs.next')}
      </Button>
    ),
    body: (
      <div className="flex flex-col">
        {concerts.length === 0 ? null : (
          <h3 className={SECTION_TITLE_CLASS}>{t('sessions.practiceSongs.concerts')}</h3>
        )}
        <ul
          aria-label={t('sessions.practiceSongs.concerts')}
          className="m-0 flex list-none flex-col p-0"
        >
          {concerts.map((concert) => (
            <li key={concert.id}>
              <CheckableRow
                title={concert.venue ?? dateOf(concert)}
                detail={dateOf(concert)}
                leading={<Icon name="audience" className="shrink-0 text-accent" />}
                isChecked={pickedConcertIds.includes(concert.id)}
                isDisabled={false}
                onToggle={() => setPickedConcertIds((picked) => togglePickedId(picked, concert.id))}
              />
            </li>
          ))}
        </ul>
        {setlists.length === 0 ? null : (
          <h3 className={SECTION_TITLE_CLASS}>{t('sessions.practiceSongs.setlists')}</h3>
        )}
        <ul
          aria-label={t('sessions.practiceSongs.setlists')}
          className="m-0 flex list-none flex-col p-0"
        >
          {setlists.map((setlist) => (
            <li key={setlist.id}>
              <CheckableRow
                title={labelOfSetlist(setlist)}
                detail={t('setlist.songCount', { count: setlist.songCount })}
                leading={<Icon name="setlist" className="shrink-0 text-accent" />}
                isChecked={pickedSetlistIds.includes(setlist.id)}
                isDisabled={false}
                onToggle={() => setPickedSetlistIds((picked) => togglePickedId(picked, setlist.id))}
              />
            </li>
          ))}
        </ul>
        {concerts.length === 0 && setlists.length === 0 ? (
          <p className="m-0 px-1 py-4 text-meta text-ink-soft">
            {t('sessions.practiceSongs.noSource')}
          </p>
        ) : null}
      </div>
    ),
  };

  const songsStep = {
    subheader: undefined,
    footer: (
      <>
        <Button variant="secondary" icon="chevL" onClick={() => setStep('sources')}>
          {t('sessions.practiceSongs.back')}
        </Button>
        <Button
          variant="primary"
          icon="check"
          size="lg"
          disabled={saveSongs.isPending}
          onClick={save}
        >
          {t('sessions.practiceSongs.save')}
        </Button>
      </>
    ),
    body: (
      <ul aria-label={title} className="m-0 flex list-none flex-col p-0">
        {songIds.map((songId) => {
          const song = songsById[songId];
          return song === undefined ? null : (
            <li key={songId}>
              <CheckableRow
                title={song.title}
                detail={song.artist}
                leading={<AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} />}
                isChecked={tickedSongIds.includes(songId)}
                isDisabled={saveSongs.isPending}
                onToggle={() => setTickedSongIds((ticked) => togglePickedId(ticked, songId))}
              />
            </li>
          );
        })}
        {songIds.length === 0 ? (
          <li className="px-1 py-4 text-meta text-ink-soft">
            {t('sessions.practiceSongs.noSong')}
          </li>
        ) : null}
      </ul>
    ),
  };
  const shown = step === 'sources' ? sourcesStep : songsStep;

  return (
    <Sheet
      size="full"
      title={title}
      label={title}
      onClose={props.onClose}
      subheader={shown.subheader}
      footer={shown.footer}
    >
      {saveSongs.isError ? (
        <p
          className="m-0 mb-2 rounded-md bg-danger-soft px-3 py-2 text-meta text-danger"
          role="alert"
        >
          {t('sessions.practiceSongs.failure')}
        </p>
      ) : null}
      {shown.body}
    </Sheet>
  );
}
