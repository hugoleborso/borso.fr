/** @Feature setlists */

import { type JSX, type ReactNode, useCallback, useMemo, useState } from 'react';
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
import { Button } from '../atoms/Button';
import { AddSongsSearchBar } from './AddSongsSearchBar';
import { PickableSongRow } from '../molecules/PickableSongRow';
import { SectionTabs } from '../molecules/SectionTabs';
import { SongSearchHits } from '../molecules/SongSearchHits';
import { Sheet } from '../molecules/Sheet';
import type { SongStatus } from '../molecules/StatusChip';
import {
  type AddSongsFilter,
  type AddSongsRow,
  addPick,
  buildAddSongsRows,
  DEFAULT_ADD_SONGS_FILTER,
  selectAddSongsEmptyMessageKey,
  shouldSearchMusicService,
  togglePick,
} from './add-songs.core';
import { SetlistSourcesPanel } from './SetlistSourcesPanel';

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

type PickerSource = 'catalogue' | 'setlists';

interface PickerSourceView {
  readonly subheader: ReactNode;
  readonly body: ReactNode;
}

const NO_PICKED_SETLIST: readonly string[] = [];

const NEW_SONG_STATUS: SongStatus = 'idea';
const SEARCH_DEBOUNCE_MS = 400;
const POSITION_DIGITS = 2;

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
  const [source, setSource] = useState<PickerSource>('catalogue');
  const [pickedSetlistIds, setPickedSetlistIds] = useState<readonly string[]>(NO_PICKED_SETLIST);
  const songsById = useMemo(
    () => Object.fromEntries(songs.map((song) => [song.id, song])),
    [songs],
  );
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

  const isSearchingService = source === 'catalogue' && shouldSearchMusicService(songs, query);
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

  const sourceViews = {
    catalogue: {
      subheader: (
        <AddSongsSearchBar
          query={query}
          filter={filter}
          onSearchMount={cancelSearchOnUnmount}
          onQueryChange={changeQuery}
          onFilterChange={setFilter}
        />
      ),
      body: (
        <>
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
            <SongSearchHits
              typedTitle={query.trim()}
              hits={hits}
              isDisabled={isBusy}
              onCreateIdea={() =>
                void checkCreatedSong({ title: query.trim(), status: NEW_SONG_STATUS })
              }
              onPickHit={pickHit}
            />
          ) : null}
        </>
      ),
    },
    setlists: {
      subheader: (
        <p className="m-0 text-meta text-ink-soft">{t('setlist.addSongsFromSetlistsHint')}</p>
      ),
      body: (
        <SetlistSourcesPanel
          setlistId={setlistId}
          setlistSongIds={setlistSongIds}
          songsById={songsById}
          pickedSetlistIds={pickedSetlistIds}
          pickedSongIds={draft.pickedSongIds}
          isDisabled={isBusy}
          onToggleSetlist={(next) => {
            setPickedSetlistIds(next.pickedSetlistIds);
            draft.revise(() => next.pickedSongIds);
          }}
          onToggleSong={(songId) => draft.revise((picked) => togglePick(picked, songId))}
        />
      ),
    },
  } as const satisfies Readonly<Record<PickerSource, PickerSourceView>>;
  const shownSource = sourceViews[source];

  return (
    <Sheet
      size="full"
      title={t('setlist.addSongsTitle', { name: setlistName })}
      label={t('setlist.addSongsTitle', { name: setlistName })}
      onClose={onClose}
      subheader={
        <div className="flex flex-col gap-2">
          <SectionTabs
            label={t('setlist.addSongsSourceLabel')}
            tabs={[
              { value: 'catalogue', label: t('setlist.addSongsFromCatalogue'), icon: 'song' },
              { value: 'setlists', label: t('setlist.addSongsFromSetlists'), icon: 'setlist' },
            ]}
            value={source}
            onChange={setSource}
          />
          {shownSource.subheader}
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
      {shownSource.body}
    </Sheet>
  );
}
