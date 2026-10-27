/** @Feature setlists */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { useCreateSong } from '../../lib/queries/songs.queries';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ListRow } from '../molecules/ListRow';
import { Sheet } from '../molecules/Sheet';
import { type SongStatus, StatusChip } from '../molecules/StatusChip';
import {
  filterPickableSongs,
  selectPickerCloseLabelKey,
  shouldOfferCreatingSong,
} from './song-picker.core';

export interface PickerSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: SongStatus;
}

export interface SetlistSongPickerProps {
  readonly open: boolean;
  readonly songs: readonly PickerSong[];
  readonly onPick: (songId: string) => void;
  readonly onClose: () => void;
}

const NEW_SONG_STATUS: SongStatus = 'idea';

// @FollowsBlueprint organism-query-owning
export function SetlistSongPicker(props: SetlistSongPickerProps): JSX.Element | null {
  if (!props.open) return null;
  return <SetlistSongPickerContent {...props} />;
}

function SetlistSongPickerContent({ songs, onPick, onClose }: SetlistSongPickerProps): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [addedCount, setAddedCount] = useState(0);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const createSong = useCreateSong();

  const visibleSongs = filterPickableSongs(songs, query);
  const isOfferingCreate = shouldOfferCreatingSong(songs, query);
  const closeLabelKey = selectPickerCloseLabelKey(addedCount);

  const addSong = (songId: string): void => {
    onPick(songId);
    setLastAddedId(songId);
    setAddedCount((count) => count + 1);
  };

  const createAndAddSong = async (): Promise<void> => {
    const title = query.trim();
    if (title.length === 0) return;
    try {
      const created = await createSong.mutateAsync({ title, status: NEW_SONG_STATUS });
      addSong(created.song.id);
      setQuery('');
    } catch (error) {
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    }
  };

  return (
    <Sheet
      size="full"
      title={t('setlist.addSong')}
      label={t('setlist.addSong')}
      isDismissible={false}
      onClose={onClose}
      footer={
        <Button variant="primary" icon="check" onClick={onClose}>
          {t(closeLabelKey, { count: addedCount })}
        </Button>
      }
    >
      <form
        className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-raised px-4 pt-1 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isOfferingCreate) return;
          void createAndAddSong();
        }}
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
            <Icon name="search" />
          </span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('setlist.addSongSearchPlaceholder')}
            aria-label={t('setlist.addSongSearchPlaceholder')}
            className="pl-9"
          />
        </div>
        {isOfferingCreate ? (
          <Button type="submit" variant="primary" icon="plus" disabled={createSong.isPending}>
            {t('setlist.addSongCreate', { title: query.trim() })}
          </Button>
        ) : null}
      </form>
      {localError === null ? null : (
        <p className="text-meta text-danger" role="alert">
          {localError}
        </p>
      )}
      <ul className="-mx-2 m-0 flex list-none flex-col gap-1 p-0">
        {visibleSongs.map((song) => (
          <li key={song.id}>
            <ListRow
              onClick={() => addSong(song.id)}
              isChevronShown={false}
              leading={
                <Icon
                  name={lastAddedId === song.id ? 'check' : 'plus'}
                  className="shrink-0 text-ink-soft"
                />
              }
              className={composeClassName(
                'min-h-12 rounded-md px-2.5 py-2 transition-colors',
                lastAddedId === song.id ? 'bg-accent-soft' : 'hover:bg-hover',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{song.title}</span>
                <span className="block truncate text-meta text-ink-soft">{song.artist}</span>
              </span>
              <StatusChip status={song.status} />
            </ListRow>
          </li>
        ))}
        {visibleSongs.length === 0 ? (
          <li className="px-3 py-4 text-meta text-ink-soft">{t('setlist.addSongNoMatch')}</li>
        ) : null}
      </ul>
    </Sheet>
  );
}
