/**
 * Per-song edit + create page. URL `:songId === 'new'` triggers the
 * create flow; `/catalog/:songId/edit` loads the existing song and
 * edits it in place. The read-only `/catalog/:songId` route lives in
 * SongDetailPage.tsx.
 *
 * This file owns the data-fetch + navigation; the form itself lives
 * in `SongEditForm.tsx` so the per-file line budget stays under cap
 * as the form grew to cover the MusicBrainz enrichment fields.
 *
 * A `?title=` parameter prefills the title, which is how the catalog hands
 * over what the operator typed in the search box before finding nothing.
 *
 * An update and a delete are both fired without being awaited: the caches
 * already hold the result, so the operator reads the edited song, or the
 * catalog without the deleted one, straight away instead of watching a
 * spinner. Neither failure goes unreported — `useMutationState` carries it to
 * wherever they landed, the song page for an update and the catalog for a
 * delete. A create is awaited, because the route it navigates to needs the id
 * only the server can issue.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { ApiError } from '../../lib/api';
import { useNavigateTo } from '../../lib/navigation';
import { useCreateSong, useDeleteSong, useSong, useUpdateSong } from '../../lib/queries/songs';
import { selectMissingSongMessageKey } from './missing-song.core';
import { SongEditForm } from './SongEditForm';
import {
  BLANK_SONG_DRAFT,
  payloadFromDraft,
  type SongDraftState,
  singleSongSchema,
  songFromApi,
} from './song-draft.core';

// @FollowsBlueprint route-detail-page
export function SongEditPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const navigateTo = useNavigateTo();
  const [searchParams] = useSearchParams();
  const prefilledTitle = searchParams.get('title') ?? '';
  const isNew = songId === undefined || songId === 'new';
  const songQuery = useSong(songId ?? '', !isNew);
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const [localError, setLocalError] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState('');

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
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    }
  };

  const removeSong = (): void => {
    if (songId === undefined || isNew) return;
    deleteSong.mutate({ id: songId });
    navigateTo('/catalog', { replace: true });
  };

  if (isLoading) {
    return <p className="px-4 sm:px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
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
      onSubmit={saveSong}
      onDelete={removeSong}
      newLinkUrl={newLinkUrl}
      setNewLinkUrl={setNewLinkUrl}
      error={localError}
    />
  );
}
