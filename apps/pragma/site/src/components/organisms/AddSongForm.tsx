/** @Feature songs */

import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from '../../lib/debounce.utils';
import { focusFieldAboveKeyboard } from '../../lib/keyboard-reveal.adapter';
import { useNavigateTo } from '../../lib/navigation.hook';
import {
  NO_SAVE_REFUSAL,
  type SongSaveRefusal,
  selectSongSaveRefusal,
} from '../../lib/queries/song-save-refusal.core';
import { useCreateSong, useSongSearch } from '../../lib/queries/songs.queries';
import {
  type AddSongDraft,
  applyPickedTrack,
  buildNewSongPayload,
  canAddSong,
  shouldSearchMusicServiceFor,
  startAddSongDraft,
} from '../../routes/catalog/add-song.core';
import { SONG_STATUS_LABEL_KEY, songStatuses } from '../../routes/catalog/song-draft.core';
import { AlbumCover } from '../atoms/AlbumCover';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Input } from '../atoms/Input';
import { DeezerTrackTakenNotice } from '../molecules/DeezerTrackTakenNotice';
import { SongActionRow } from '../molecules/PickableSongRow';

export interface AddSongFormProps {
  readonly initialTitle: string;
}

const SEARCH_DEBOUNCE_MS = 400;
const LABEL_CLASS = 'text-label font-medium tracking-wider text-ink-soft uppercase';

// @FollowsBlueprint organism-query-owning
export function AddSongForm({ initialTitle }: AddSongFormProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const createSong = useCreateSong();
  const [draft, setDraft] = useState<AddSongDraft>(() => startAddSongDraft(initialTitle));
  const [searchedTitle, setSearchedTitle] = useState(initialTitle.trim());
  const [refusal, setRefusal] = useState<SongSaveRefusal>(NO_SAVE_REFUSAL);
  const publishSearchedTitle = useMemo(
    () => debounce((title: string) => setSearchedTitle(title), SEARCH_DEBOUNCE_MS),
    [],
  );
  const isSearching = shouldSearchMusicServiceFor(searchedTitle, draft.pickedTrack);
  const search = useSongSearch(isSearching ? searchedTitle : '');
  const hits = isSearching ? (search.data?.hits ?? []) : [];

  const changeTitle = (title: string): void => {
    setDraft({ ...draft, title, pickedTrack: null });
    publishSearchedTitle(title.trim());
  };

  const addSong = async (): Promise<void> => {
    setRefusal(NO_SAVE_REFUSAL);
    try {
      const created = await createSong.mutateAsync(buildNewSongPayload(draft));
      navigateTo(`/catalog/${created.song.id}`, { replace: true });
    } catch (error) {
      setRefusal(selectSongSaveRefusal(error));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className={LABEL_CLASS} htmlFor="add-song-title">
        {t('catalog.songTitle')}
      </label>
      <div className="flex items-center gap-3">
        {draft.pickedTrack === null ? null : (
          <AlbumCover title={draft.title} deezerAlbumId={draft.pickedTrack.deezerAlbumId} />
        )}
        <Input
          ref={focusFieldAboveKeyboard}
          id="add-song-title"
          type="text"
          enterKeyHint="search"
          className="scroll-mt-12"
          value={draft.title}
          maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
          onChange={(event) => changeTitle(event.target.value)}
        />
      </div>
      {hits.length === 0 ? null : (
        <section className="flex flex-col gap-1">
          <h2 className={LABEL_CLASS}>{t('setlist.addSongsFromService')}</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {hits.map((hit) => (
              <li key={hit.deezerTrackId}>
                <SongActionRow
                  title={hit.title}
                  detail={hit.artist}
                  leading={<AlbumCover title={hit.title} deezerAlbumId={hit.deezerAlbumId} />}
                  isDisabled={createSong.isPending}
                  onSelect={() => setDraft(applyPickedTrack(draft, hit))}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <label className={LABEL_CLASS} htmlFor="add-song-artist">
        {t('catalog.artist')}
      </label>
      <Input
        id="add-song-artist"
        type="text"
        value={draft.artist}
        maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
        onChange={(event) => setDraft({ ...draft, artist: event.target.value })}
      />
      <span className={LABEL_CLASS}>{t('catalog.status')}</span>
      <div role="group" aria-label={t('catalog.status')} className="flex flex-wrap gap-2">
        {songStatuses.map((status) => (
          <Chip
            key={status}
            pressed={draft.status === status}
            onPress={() => setDraft({ ...draft, status })}
          >
            {t(SONG_STATUS_LABEL_KEY[status])}
          </Chip>
        ))}
      </div>
      {refusal.failureMessage === null ? null : (
        <p className="m-0 text-meta text-danger" role="alert">
          {refusal.failureMessage}
        </p>
      )}
      {refusal.takenTrack === null ? null : (
        <DeezerTrackTakenNotice takenTrack={refusal.takenTrack} />
      )}
      <BottomActions>
        <Button
          variant="primary"
          size="lg"
          icon="plus"
          disabled={!canAddSong(draft) || createSong.isPending}
          onClick={() => void addSong()}
        >
          {t('catalog.addSong')}
        </Button>
      </BottomActions>
    </div>
  );
}
