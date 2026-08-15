/**
 * The add-a-song sheet of the setlist editor.
 *
 * Adding a song used to mean unfolding a `<details>` holding the whole
 * catalog in alphabetical order and hunting for a title. Here the sheet
 * opens on a search field, every keystroke narrows the list, a tap adds
 * the song and leaves the sheet open so the next one is one tap away,
 * and a title the catalog does not carry can be created from the same
 * field instead of sending the operator to the catalog and back.
 *
 * The created song is a stub — title only — because the point is to get
 * the setlist written; the catalog page fills the rest in later.
 *
 * The create action sits directly under the search field, and the field
 * is wrapped in a form so the keyboard's own return key runs it. In the
 * sheet's footer it was 447 px below the last line of content, which on
 * a phone is behind the keyboard the title was just typed with, and
 * pressing return did nothing at all.
 * @Feature setlists
 */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { openDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { useCreateSong } from '../../lib/queries/songs.queries';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
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
    <dialog
      ref={openDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-1rem)] sm:w-[34rem] max-w-[34rem] h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
        <h2 className="font-display italic text-xl text-ink-900 m-0">{t('setlist.addSong')}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t(closeLabelKey, { count: addedCount })}
        </Button>
      </div>
      <form
        className="flex flex-col gap-2 px-4 pt-3 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isOfferingCreate) return;
          void createAndAddSong();
        }}
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
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
          <Button type="submit" variant="accent" disabled={createSong.isPending}>
            <Icon name="plus" size={14} />
            {t('setlist.addSongCreate', { title: query.trim() })}
          </Button>
        ) : null}
      </form>
      {localError === null ? null : (
        <p className="px-4 text-danger text-sm" role="alert">
          {localError}
        </p>
      )}
      <ul className="flex-1 overflow-y-auto px-2 pb-2 m-0 list-none flex flex-col gap-1">
        {visibleSongs.map((song) => (
          <li key={song.id}>
            <button
              type="button"
              onClick={() => addSong(song.id)}
              className={composeClassName(
                'w-full text-left flex items-center gap-2 min-h-12 px-2.5 py-2 rounded-md border cursor-pointer transition-colors',
                lastAddedId === song.id
                  ? 'border-accent bg-accent-soft'
                  : 'border-transparent hover:bg-bg-sunk',
              )}
            >
              <Icon
                name={lastAddedId === song.id ? 'check' : 'plus'}
                size={14}
                className="text-ink-400 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-ink-900 truncate">{song.title}</span>
                <span className="block text-xs text-ink-500 truncate">{song.artist}</span>
              </span>
              <StatusChip status={song.status} />
            </button>
          </li>
        ))}
        {visibleSongs.length === 0 ? (
          <li className="px-3 py-4 text-sm italic text-ink-400">{t('setlist.addSongNoMatch')}</li>
        ) : null}
      </ul>
    </dialog>
  );
}
