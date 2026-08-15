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
 * An update is fired without being awaited: the caches already hold the new
 * values, so the operator reads the edited song straight away instead of
 * watching a spinner, and a write that then fails is surfaced on the song page
 * they landed on. A create is awaited, because the route it navigates to needs
 * the id only the server can issue.
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
    const parsed = singleSongSchema.safeParse({ song: songQuery.data.song });
    if (!parsed.success) return BLANK_SONG_DRAFT;
    return songFromApi(parsed.data.song);
  }, [isNew, songQuery.data, prefilledTitle]);

  const formKey = isNew
    ? `new:${prefilledTitle}`
    : `${songId}:${songQuery.data?.song.id ?? 'loading'}`;
  const isLoading = !isNew && songQuery.isLoading;
  const isEditingMissingSong = !isNew && !songQuery.isLoading && songQuery.data === undefined;

  const saveSong = async (value: SongDraftState): Promise<void> => {
    const payload = payloadFromDraft(value);
    if (payload === null) return;
    try {
      if (isNew) {
        const created = await createSong.mutateAsync(payload);
        navigateTo(`/catalog/${created.song.id}`, { replace: true });
      } else {
        updateSong.mutate({ id: songId, ...payload });
        navigateTo(`/catalog/${songId}`);
      }
    } catch (error) {
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    }
  };

  const removeSong = async (): Promise<void> => {
    if (songId === undefined || isNew) return;
    try {
      // eslint-disable-next-line borso/no-discarded-await-before-navigation -- a delete is the one write where waiting is the point: the operator should not walk away believing a song is gone until the server says so, and this form's error line is the only place a failed delete can be reported, since /catalog shows the row returning but says nothing.
      await deleteSong.mutateAsync({ id: songId });
      navigateTo('/catalog', { replace: true });
    } catch (error) {
      setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
    }
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
