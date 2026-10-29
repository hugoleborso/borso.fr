/** @Feature sessions */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useSavePracticeSongs } from '../../lib/queries/practice-songs.queries';
import { useSetlistsList } from '../../lib/queries/setlists.queries';
import {
  listPickableConcerts,
  listPickableSongIds,
  type PooledSetlist,
  planPracticeSongsSave,
  poolConcertSongIds,
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

type PracticeSongsStep = 'concerts' | 'songs';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function PracticeSongsSheet(props: PracticeSongsSheetProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const setlistsQuery = useSetlistsList();
  const saveSongs = useSavePracticeSongs();
  const [step, setStep] = useState<PracticeSongsStep>('concerts');
  const [query, setQuery] = useState('');
  const { songIds: practiceSongIds, songsById, entriesBySetlistId } = props.practiceSongs;
  const preparedConcertId = props.practice.preparedConcertId ?? null;
  const [pickedConcertIds, setPickedConcertIds] = useState<readonly string[]>(
    preparedConcertId === null ? NO_ROWS : [preparedConcertId],
  );
  const [tickedSongIds, setTickedSongIds] = useState<readonly string[]>(practiceSongIds);

  const dateOf = (concert: PracticeSongsConcert): string =>
    formatSessionDate(concert.date, i18n.language);
  const concerts = listPickableConcerts(
    props.sessions,
    query,
    (concert) => `${concert.venue ?? ''} ${dateOf(concert)}`,
  );
  const pooledSongIds = poolConcertSongIds(pickedConcertIds, setlistsQuery.data?.setlists ?? []);
  const songIds = listPickableSongIds(pooledSongIds, practiceSongIds).filter(
    (songId) => songsById[songId] !== undefined,
  );
  const title = t(
    step === 'concerts'
      ? 'sessions.practiceSongs.concertsTitle'
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

  const concertsStep = {
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
      <ul aria-label={title} className="m-0 flex list-none flex-col p-0">
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
        {concerts.length === 0 ? (
          <li className="px-1 py-4 text-meta text-ink-soft">
            {t('sessions.practiceSongs.noConcert')}
          </li>
        ) : null}
      </ul>
    ),
  };

  const songsStep = {
    subheader: undefined,
    footer: (
      <>
        <Button variant="secondary" icon="chevL" onClick={() => setStep('concerts')}>
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
  const shown = step === 'concerts' ? concertsStep : songsStep;

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
