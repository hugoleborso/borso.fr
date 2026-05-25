/**
 * Per-song edit + create page. URL `:songId === 'new'` triggers the
 * create flow; `/catalog/:songId/edit` loads the existing song and
 * edits it in place. The read-only `/catalog/:songId` route lives in
 * SongDetailPage.tsx.
 *
 * The form covers the spec's `Song` interface: title, artist, status,
 * tonality, base energy, external links, and the chord-chart variant.
 * Field state is owned by a TanStack Form instance; the form is
 * keyed on song id so React mounts a fresh instance whenever a
 * different song is loaded.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Icon } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SongSearch } from '../../components/molecules/SongSearch';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { ApiError } from '../../lib/api';
import { useCreateSong, useDeleteSong, useSong, useUpdateSong } from '../../lib/queries/songs';
import { deriveTonality } from '../../lib/tonality-bridge';
import { SongChartFields } from './SongChartFields';
import { SongExternalLinks } from './SongExternalLinks';
import {
  BLANK_SONG_DRAFT,
  chartFromDraft,
  detectProvider,
  type SongDraftState,
  singleSongSchema,
  songFromApi,
  songStatuses,
} from './song-draft';

const TITLE_MAX = 256;
const ARTIST_MAX = 256;

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

  const loading = !isNew && songQuery.isLoading;
  const queryError = songQuery.error instanceof ApiError ? songQuery.error.message : null;

  if (loading) {
    return <p className="px-4 sm:px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  return (
    <SongEditPageForm
      key={formKey}
      isNew={isNew}
      songId={songId}
      defaultValues={defaultValues}
      onSubmit={async (value) => {
        const trimmed = value.title.trim();
        if (trimmed.length === 0) return;
        const baseEnergyValue =
          value.baseEnergy.trim().length === 0 ? null : Number(value.baseEnergy);
        const payload = {
          title: trimmed,
          artist: value.artist.trim(),
          status: value.status,
          tonalityStart:
            value.tonalityStart.trim().length === 0 ? null : value.tonalityStart.trim(),
          tonalityEnd: value.tonalityEnd.trim().length === 0 ? null : value.tonalityEnd.trim(),
          baseEnergy: baseEnergyValue,
          chart: chartFromDraft(value),
          links: value.links,
        };
        try {
          if (isNew) {
            const created = await createSong.mutateAsync(payload);
            navigate(`/catalog/${created.song.id}`, { replace: true });
          } else if (songId !== undefined) {
            await updateSong.mutateAsync({ id: songId, ...payload });
            navigate(`/catalog/${songId}`);
          }
        } catch (caught) {
          setLocalError(caught instanceof ApiError ? caught.message : 'unknown-error');
        }
      }}
      onDelete={async () => {
        if (songId === undefined || isNew) return;
        try {
          await deleteSong.mutateAsync({ id: songId });
          navigate('/catalog', { replace: true });
        } catch (caught) {
          setLocalError(caught instanceof ApiError ? caught.message : 'unknown-error');
        }
      }}
      newLinkUrl={newLinkUrl}
      setNewLinkUrl={setNewLinkUrl}
      error={localError ?? queryError}
    />
  );
}

interface SongEditPageFormProps {
  readonly isNew: boolean;
  readonly songId: string | undefined;
  readonly defaultValues: SongDraftState;
  readonly onSubmit: (value: SongDraftState) => Promise<void>;
  readonly onDelete: () => Promise<void>;
  readonly newLinkUrl: string;
  readonly setNewLinkUrl: (value: string) => void;
  readonly error: string | null;
}

function SongEditPageForm({
  isNew,
  songId,
  defaultValues,
  onSubmit,
  onDelete,
  newLinkUrl,
  setNewLinkUrl,
  error,
}: SongEditPageFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  const handleChordproChange = (text: string): void => {
    form.setFieldValue('chordproText', text);
    const derived = deriveTonality(text);
    const currentStart = form.getFieldValue('tonalityStart');
    const currentEnd = form.getFieldValue('tonalityEnd');
    if (currentStart.length === 0 && derived.start !== null) {
      form.setFieldValue('tonalityStart', derived.start);
    }
    if (currentEnd.length === 0 && derived.end !== null) {
      form.setFieldValue('tonalityEnd', derived.end);
    }
  };

  const addLink = (): void => {
    const trimmed = newLinkUrl.trim();
    if (trimmed.length === 0) return;
    const current = form.getFieldValue('links');
    form.setFieldValue('links', [
      ...current,
      { url: trimmed, provider: detectProvider(trimmed), comment: '' },
    ]);
    setNewLinkUrl('');
  };

  const removeLink = (index: number): void => {
    const current = form.getFieldValue('links');
    form.setFieldValue(
      'links',
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const labelClass = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
      >
        <Icon name="chevL" size={14} />
        {t('catalog.backToCatalog')}
      </Link>
      <form.Subscribe selector={(state) => [state.values.artist, state.values.title] as const}>
        {([artistValue, titleValue]) => (
          <PageHeader
            crumb={artistValue.length > 0 ? artistValue : t('catalog.crumb')}
            title={isNew ? t('catalog.newSong') : titleValue}
            actions={
              !isNew && songId !== undefined ? (
                <Link to={`/catalog/${songId}/scene`}>
                  <Button variant="accent" type="button">
                    <Icon name="play" size={14} />
                    {t('catalog.openScene')}
                  </Button>
                </Link>
              ) : null
            }
          />
        )}
      </form.Subscribe>

      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <form.Subscribe
        selector={(state) => [state.values.chartKind, state.values.chordproText] as const}
      >
        {([chartKindValue, chordproValue]) =>
          chartKindValue === 'chordpro' && chordproValue.length > 0 ? (
            <Card variant="bare">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
                <Icon name="text" size={14} className="text-ink-500" />
                <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
              </div>
              <div className="p-4">
                <ChordChartViewer source={chordproValue} compact />
              </div>
            </Card>
          ) : null
        }
      </form.Subscribe>

      <form.Field name="links">
        {(field) => <SongExternalLinks links={field.state.value} onRemove={removeLink} />}
      </form.Field>

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-2.5"
        >
          {isNew ? (
            <SongSearch
              onPick={(hit) => {
                form.setFieldValue('title', hit.title);
                form.setFieldValue('artist', hit.artist);
              }}
              className="mb-2"
            />
          ) : null}
          <label className={labelClass} htmlFor="song-title">
            {t('catalog.songTitle')}
          </label>
          <form.Field name="title">
            {(field) => (
              <Input
                id="song-title"
                type="text"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={TITLE_MAX}
              />
            )}
          </form.Field>

          <label className={labelClass} htmlFor="song-artist">
            {t('catalog.artist')}
          </label>
          <form.Field name="artist">
            {(field) => (
              <Input
                id="song-artist"
                type="text"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                maxLength={ARTIST_MAX}
              />
            )}
          </form.Field>

          <label className={labelClass} htmlFor="song-status">
            {t('catalog.status')}
          </label>
          <form.Field name="status">
            {(field) => (
              <select
                id="song-status"
                value={field.state.value}
                onChange={(event) => {
                  const parsed = z.enum(songStatuses).safeParse(event.target.value);
                  if (parsed.success) field.handleChange(parsed.data);
                }}
                onBlur={field.handleBlur}
                className="w-full bg-bg-elev border border-line text-ink-900 rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink-700"
              >
                {songStatuses.map((status) => (
                  <option key={status} value={status}>
                    {t(
                      `catalog.status${status.charAt(0).toUpperCase() + status.slice(1).replace('_r', 'R').replace('_', '')}`,
                    )}
                  </option>
                ))}
              </select>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) =>
              [
                state.values.chartKind,
                state.values.chordproText,
                state.values.pdfS3Key,
                state.values.imageS3Key,
                state.values.tonalityStart,
                state.values.tonalityEnd,
                state.values.baseEnergy,
              ] as const
            }
          >
            {([
              chartKindValue,
              chordproValue,
              pdfS3KeyValue,
              imageS3KeyValue,
              tonalityStartValue,
              tonalityEndValue,
              baseEnergyValue,
            ]) => (
              <SongChartFields
                chartKind={chartKindValue}
                chordproText={chordproValue}
                pdfS3Key={pdfS3KeyValue}
                imageS3Key={imageS3KeyValue}
                tonalityStart={tonalityStartValue}
                tonalityEnd={tonalityEndValue}
                baseEnergy={baseEnergyValue}
                {...(songId !== undefined && !isNew ? { songId } : {})}
                onChartKindChange={(kind) => form.setFieldValue('chartKind', kind)}
                onChordproChange={handleChordproChange}
                onPdfKeyChange={(value) => form.setFieldValue('pdfS3Key', value)}
                onImageKeyChange={(value) => form.setFieldValue('imageS3Key', value)}
                onTonalityStartChange={(value) => form.setFieldValue('tonalityStart', value)}
                onTonalityEndChange={(value) => form.setFieldValue('tonalityEnd', value)}
                onBaseEnergyChange={(value) => form.setFieldValue('baseEnergy', value)}
              />
            )}
          </form.Subscribe>

          <fieldset className="border border-line rounded-md p-3 mt-2">
            <legend className={`${labelClass} px-2`}>{t('catalog.linksTitle')}</legend>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder={t('catalog.linkPlaceholder')}
                value={newLinkUrl}
                onChange={(event) => setNewLinkUrl(event.target.value)}
              />
              <Button type="button" variant="default" onClick={addLink}>
                <Icon name="plus" size={14} />
                {t('common.add')}
              </Button>
            </div>
          </fieldset>

          <div className="flex gap-2 mt-3">
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="accent"
                  disabled={!canSubmit || isSubmitting}
                >
                  {t('common.save')}
                </Button>
              )}
            </form.Subscribe>
            {!isNew ? (
              <Button type="button" variant="ghost" onClick={() => void onDelete()}>
                <Icon name="trash" size={14} />
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </section>
  );
}
