/**
 * Per-song edit + create page. URL `:songId === 'new'` triggers the
 * create flow; `/catalog/:songId/edit` loads the existing song and
 * edits it in place. The read-only `/catalog/:songId` route lives in
 * SongDetailPage.tsx.
 *
 * This file owns the data-fetch + navigation; the form itself lives
 * in `SongEditForm.tsx` so the per-file line budget stays under cap
 * as the form grew to cover the MusicBrainz enrichment fields.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useCreateSong, useDeleteSong, useSong, useUpdateSong } from '../../lib/queries/songs';
import { SongEditForm } from './SongEditForm';
import {
  BLANK_SONG_DRAFT,
  payloadFromDraft,
  type SongDraftState,
  singleSongSchema,
  songFromApi,
} from './song-draft';

export function SongEditPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const isNew = songId === undefined || songId === 'new';
  const songQuery = useSong(songId ?? '', !isNew);
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const [localError, setLocalError] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const defaultValues = useMemo<SongDraftState>(() => {
    if (isNew) return BLANK_SONG_DRAFT;
    if (songQuery.data?.song === undefined) return BLANK_SONG_DRAFT;
    const parsed = singleSongSchema.safeParse({ song: songQuery.data.song });
    if (!parsed.success) return BLANK_SONG_DRAFT;
    return songFromApi(parsed.data.song);
  }, [isNew, songQuery.data]);

  const formKey = isNew ? 'new' : `${songId}:${songQuery.data?.song?.id ?? 'loading'}`;
  const isLoading = !isNew && songQuery.isLoading;
  const queryError = songQuery.error instanceof ApiError ? songQuery.error.message : null;

  const handleSubmit = async (value: SongDraftState): Promise<void> => {
    const payload = payloadFromDraft(value);
    if (payload === null) return;
    try {
      if (isNew) {
        const created = await createSong.mutateAsync(payload);
        navigate(`/catalog/${created.song.id}`, { replace: true });
      } else if (songId !== undefined) {
        await updateSong.mutateAsync({ id: songId, ...payload });
        navigate(`/catalog/${songId}`);
      }
    } catch (error) {
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (songId === undefined || isNew) return;
    try {
      await deleteSong.mutateAsync({ id: songId });
      navigate('/catalog', { replace: true });
    } catch (error) {
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    }
  };

  if (isLoading) {
    return <p className="px-4 sm:px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  return (
    <SongEditForm
      key={formKey}
      isNew={isNew}
      songId={songId}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      newLinkUrl={newLinkUrl}
      setNewLinkUrl={setNewLinkUrl}
      error={localError ?? queryError}
    />
  );
}
