/** @Feature setlists */

import { type JSX, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddSongsDraft } from '../../lib/add-songs-draft.store';
import { debounce } from '../../lib/debounce.utils';
import { useAddSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { selectSongSaveRefusal } from '../../lib/queries/song-save-refusal.core';
import {
  type ExternalSongHit,
  useCreateSong,
  useSongSearch,
} from '../../lib/queries/songs.queries';
import { reportSetlistBatchAddFailed } from '../../observability/error-reporting.adapter';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { AlbumCover } from '../atoms/AlbumCover';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { PickableSongRow, SongActionRow } from '../molecules/PickableSongRow';
import { Sheet } from '../molecules/Sheet';
import type { SongStatus } from '../molecules/StatusChip';
import {
  ADD_SONGS_FILTERS,
  type AddSongsFilter,
  type AddSongsRow,
  addPick,
  buildAddSongsRows,
  DEFAULT_ADD_SONGS_FILTER,
  selectAddSongsEmptyMessageKey,
  shouldSearchMusicService,
  togglePick,
} from './add-songs.core';

export interface PickerSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: SongStatus;
  readonly deezerAlbumId: string | null;
}

export interface SetlistSongPickerProps {
  readonly open: boolean;
  readonly setlistId: string;
  readonly setlistName: string;
  readonly songs: readonly PickerSong[];
  readonly setlistSongIds: readonly string[];
  readonly onClose: () => void;
  readonly onAdded?: () => void;
}

const NEW_SONG_STATUS: SongStatus = 'idea';
const SEARCH_DEBOUNCE_MS = 400;
const POSITION_DIGITS = 2;

const FILTER_LABEL_KEY = {
  'not-in-setlist': 'setlist.addSongsFilterNotInSetlist',
  'concert-ready': 'setlist.addSongsFilterConcertReady',
  rehearsed: 'setlist.addSongsFilterRehearsed',
  learning: 'setlist.addSongsFilterToLearn',
  ideas: 'setlist.addSongsFilterIdeas',
} as const satisfies Readonly<Record<AddSongsFilter, string>>;

type PickerFailureKey =
  | 'setlist.failure.addSongs'
  | 'setlist.addSongsCreateFailed'
  | 'setlist.addSongsServiceUnavailable';

// @FollowsBlueprint organism-query-owning
export function SetlistSongPicker(props: SetlistSongPickerProps): JSX.Element | null {
  if (!props.open) return null;
  return <SetlistSongPickerContent {...props} />;
}

function SetlistSongPickerContent({
  setlistId,
  setlistName,
  songs,
  setlistSongIds,
  onClose,
  onAdded = onClose,
}: SetlistSongPickerProps): JSX.Element {
  const { t } = useTranslation();
  const draft = useAddSongsDraft(setlistId);
  const [query, setQuery] = useState('');
  const [searchedTitle, setSearchedTitle] = useState('');
  const [filter, setFilter] = useState<AddSongsFilter>(DEFAULT_ADD_SONGS_FILTER);
  const [failureKey, setFailureKey] = useState<PickerFailureKey | null>(null);
  const createSong = useCreateSong();
  const addEntries = useAddSetlistEntries();
  const publishSearchedTitle = useMemo(
    () => debounce((title: string) => setSearchedTitle(title), SEARCH_DEBOUNCE_MS),
    [],
  );
  const cancelSearchOnUnmount = useCallback(
    () => publishSearchedTitle.cancel,
    [publishSearchedTitle],
  );

  const isSearchingService = shouldSearchMusicService(songs, query);
  const search = useSongSearch(isSearchingService ? searchedTitle : '');
  const hits = isSearchingService ? (search.data?.hits ?? []) : [];
  const rows = buildAddSongsRows({
    songs,
    setlistSongIds,
    pickedSongIds: draft.pickedSongIds,
    query,
    filter,
  });
  const pickCount = draft.pickedSongIds.length;
  const hasPicks = pickCount > 0;
  const emptyMessageKey = selectAddSongsEmptyMessageKey({
    filter,
    query,
    rowCount: rows.length,
    isSearchingService,
  });
  const describeRow = (row: AddSongsRow<PickerSong>): string =>
    row.positionInSetlist === null
      ? row.song.artist
      : t('setlist.addSongsAlreadyIn', {
          position: String(row.positionInSetlist).padStart(POSITION_DIGITS, '0'),
        });
  const isBusy = createSong.isPending || addEntries.isPending;
  const shownFailureKey =
    failureKey ??
    (isSearchingService && search.error !== null ? 'setlist.addSongsServiceUnavailable' : null);

  const changeQuery = (nextQuery: string): void => {
    setQuery(nextQuery);
    publishSearchedTitle(nextQuery.trim());
  };

  const checkCreatedSong = async (input: Parameters<typeof createSong.mutateAsync>[0]) => {
    setFailureKey(null);
    try {
      const created = await createSong.mutateAsync(input);
      draft.revise((picked) => addPick(picked, created.song.id));
    } catch (error) {
      const refusal = selectSongSaveRefusal(error);
      if (refusal.takenTrack === null) {
        setFailureKey('setlist.addSongsCreateFailed');
        return;
      }
      const takenSongId = refusal.takenTrack.songId;
      draft.revise((picked) => addPick(picked, takenSongId));
    }
  };

  const pickHit = (hit: ExternalSongHit): void => {
    void checkCreatedSong({
      title: hit.title,
      artist: hit.artist,
      status: NEW_SONG_STATUS,
      album: hit.album,
      deezerTrackId: hit.deezerTrackId,
      deezerAlbumId: hit.deezerAlbumId,
      durationSeconds: hit.durationSeconds,
      isrcs: [...hit.isrcs],
    });
  };

  const addPickedSongs = (): void => {
    setFailureKey(null);
    const pickCount = draft.pickedSongIds.length;
    addEntries.mutate(
      {
        setlistId,
        appends: draft.pickedSongIds.map((songId) => ({
          songId,
          temporaryId: crypto.randomUUID(),
        })),
      },
      {
        onSuccess: () => {
          recordProductEvent('setlist_songs_added', { count: pickCount });
          draft.discard();
          onAdded();
        },
        onError: () => {
          reportSetlistBatchAddFailed(setlistId);
          setFailureKey('setlist.failure.addSongs');
        },
      },
    );
  };

  return (
    <Sheet
      size="full"
      title={t('setlist.addSongsTitle', { name: setlistName })}
      label={t('setlist.addSongsTitle', { name: setlistName })}
      onClose={onClose}
      subheader={
        <div className="flex flex-col gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
              <Icon name="search" />
            </span>
            <Input
              ref={cancelSearchOnUnmount}
              type="search"
              data-sheet-focus
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={t('setlist.addSongsSearch')}
              aria-label={t('setlist.addSongsSearch')}
              className="pl-9"
            />
          </div>
          <div
            role="group"
            aria-label={t('setlist.addSongsFilterLabel')}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
          >
            {ADD_SONGS_FILTERS.map((option) => (
              <Chip
                key={option}
                pressed={option === filter}
                onPress={() => setFilter(option)}
                className="shrink-0"
              >
                {t(FILTER_LABEL_KEY[option])}
              </Chip>
            ))}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-meta text-ink-soft">{t('setlist.addSongsFooterHint')}</span>
          <Button
            variant="primary"
            icon="plus"
            size="lg"
            disabled={!hasPicks || isBusy}
            onClick={addPickedSongs}
          >
            {hasPicks ? t('setlist.addSongsConfirm', { count: pickCount }) : t('setlist.addSongs')}
          </Button>
        </div>
      }
    >
      {shownFailureKey === null ? null : (
        <p
          className="m-0 mb-2 rounded-md bg-danger-soft px-3 py-2 text-meta text-danger"
          role="alert"
        >
          {t(shownFailureKey)}
        </p>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((row) => (
          <li key={row.song.id}>
            <PickableSongRow
              title={row.song.title}
              detail={describeRow(row)}
              deezerAlbumId={row.song.deezerAlbumId}
              pickNumber={row.pickNumber}
              isAlreadyIn={row.positionInSetlist !== null}
              isDisabled={isBusy}
              onToggle={() => {
                draft.revise((picked) => togglePick(picked, row.song.id));
                changeQuery('');
              }}
            />
          </li>
        ))}
        {emptyMessageKey === null ? null : (
          <li className="px-1 py-4 text-meta text-ink-soft">{t(emptyMessageKey)}</li>
        )}
      </ul>
      {isSearchingService ? (
        <section className="flex flex-col gap-1 pt-2">
          <ul className="m-0 flex list-none flex-col p-0">
            <li>
              <SongActionRow
                title={t('setlist.addSongsNewIdea')}
                detail={query.trim()}
                leading={
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-cover bg-accent-soft text-accent">
                    <Icon name="bulb" />
                  </span>
                }
                isDisabled={isBusy}
                onSelect={() =>
                  void checkCreatedSong({ title: query.trim(), status: NEW_SONG_STATUS })
                }
              />
            </li>
          </ul>
          {hits.length === 0 ? null : (
            <h3 className="m-0 px-1 text-label font-semibold text-ink-soft uppercase">
              {t('setlist.addSongsFromService')}
            </h3>
          )}
          <ul className="m-0 flex list-none flex-col p-0">
            {hits.map((hit) => (
              <li key={hit.deezerTrackId}>
                <SongActionRow
                  title={hit.title}
                  detail={hit.artist}
                  leading={<AlbumCover title={hit.title} deezerAlbumId={hit.deezerAlbumId} />}
                  isDisabled={isBusy}
                  onSelect={() => pickHit(hit)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Sheet>
  );
}
