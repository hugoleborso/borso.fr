/** @Feature songs */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import {
  useCreateSong,
  useDeleteSong,
  useSong,
  useUpdateSong,
} from '../../lib/queries/songs.queries';
import { selectMissingSongMessageKey } from './missing-song.core';
import {
  NO_SAVE_REFUSAL,
  type SongSaveRefusal,
  selectSongSaveRefusal,
} from '../../lib/queries/song-save-refusal.core';
import { SongEditForm } from '../../components/organisms/SongEditForm';
import {
  BLANK_SONG_DRAFT,
  payloadFromDraft,
  type SongDraftState,
  singleSongSchema,
  songFromApi,
} from './song-draft.core';
import {
  readSongEditSection,
  SONG_EDIT_SECTION_PARAM,
  type SongEditSection,
} from './song-edit-page.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-detail-page
export function SongEditPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const navigateTo = useNavigateTo();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefilledTitle = searchParams.get('title') ?? '';
  const isNew = songId === undefined || songId === 'new';
  const songQuery = useSong(songId ?? '', !isNew);
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const [saveRefusal, setSaveRefusal] = useState<SongSaveRefusal>(NO_SAVE_REFUSAL);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const section = readSongEditSection(searchParams.get(SONG_EDIT_SECTION_PARAM));
  const lineupMembers = useMemo(
    () =>
      (membersQuery.data?.members ?? NO_ROWS).map((member) => ({
        id: member.id,
        name: member.firstName,
        color: member.color,
      })),
    [membersQuery.data],
  );
  const lineupInstruments = useMemo(
    () =>
      (instrumentsQuery.data?.instruments ?? NO_ROWS).map((instrument) => ({
        id: instrument.id,
        name: instrument.name,
      })),
    [instrumentsQuery.data],
  );

  const showSection = (next: SongEditSection): void => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(SONG_EDIT_SECTION_PARAM, next);
    setSearchParams(nextParams, { replace: true });
  };

  const defaultValues = useMemo<SongDraftState>(() => {
    if (isNew) return { ...BLANK_SONG_DRAFT, title: prefilledTitle };
    if (songQuery.data?.song === undefined) return BLANK_SONG_DRAFT;
    const loadedSong = singleSongSchema.safeParse({ song: songQuery.data.song });
    if (!loadedSong.success) return BLANK_SONG_DRAFT;
    return songFromApi(loadedSong.data.song);
  }, [isNew, songQuery.data, prefilledTitle]);

  const formKey = isNew
    ? `new:${prefilledTitle}`
    : `${songId}:${songQuery.data?.song.id ?? 'loading'}`;
  const isLoading = !isNew && songQuery.isLoading;
  const isEditingMissingSong = !isNew && !songQuery.isLoading && songQuery.data === undefined;

  const saveSong = async (value: SongDraftState): Promise<void> => {
    const body = payloadFromDraft(value);
    if (body === null) return;
    try {
      if (isNew) {
        const created = await createSong.mutateAsync(body);
        navigateTo(`/catalog/${created.song.id}`, { replace: true });
      } else {
        updateSong.mutate({ id: songId, ...body });
        navigateTo(`/catalog/${songId}`);
      }
    } catch (error) {
      setSaveRefusal(selectSongSaveRefusal(error));
    }
  };

  const removeSong = (): void => {
    if (songId === undefined || isNew) return;
    deleteSong.mutate({ id: songId });
    navigateTo('/catalog', { replace: true });
  };

  if (isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 text-ink-soft italic text-meta">
        {t('common.loading')}
      </p>
    );
  }
  if (isEditingMissingSong) {
    return (
      <NotFoundNotice
        message={t(selectMissingSongMessageKey(songQuery.error))}
        backTo="/catalog"
        backLabel={t('catalog.backToCatalog')}
      />
    );
  }

  return (
    <SongEditForm
      key={formKey}
      isNew={isNew}
      songId={songId}
      defaultValues={defaultValues}
      section={section}
      members={lineupMembers}
      instruments={lineupInstruments}
      onSectionChange={showSection}
      onSubmit={saveSong}
      onDelete={removeSong}
      newLinkUrl={newLinkUrl}
      setNewLinkUrl={setNewLinkUrl}
      refusal={saveRefusal}
    />
  );
}
