/**
 * Per-song edit + create page. URL `:songId === 'new'` triggers the
 * create flow; `/catalog/:songId/edit` loads the existing song and
 * edits it in place. The read-only `/catalog/:songId` route lives in
 * SongDetailPage.tsx (round-6 fix — the prototype's song detail is
 * a display, not a form).
 *
 * The form covers the spec's `Song` interface: title, artist, status,
 * tonality, base energy, external links (rendered via SongExternalLinks
 * + embed.utils), and the chord-chart variant.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Icon } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { ApiError, apiRequest } from '../../lib/api-client';
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

export function SongEditPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  // `/catalog/new` mounts this page without a path param; the older
  // `/catalog/new` slug ridden through `:songId` is still accepted.
  const isNew = songId === undefined || songId === 'new';
  const [draft, setDraft] = useState<SongDraftState>(BLANK_SONG_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const load = useCallback(async (): Promise<void> => {
    if (isNew || songId === undefined) return;
    setLoading(true);
    try {
      const body = singleSongSchema.parse(await apiRequest(`/api/songs/${songId}`));
      setDraft(songFromApi(body.song));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, [isNew, songId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onChordproChange = (text: string): void => {
    setDraft((current) => {
      const derived = deriveTonality(text);
      const startCurrentlyEmpty = current.tonalityStart.length === 0;
      const endCurrentlyEmpty = current.tonalityEnd.length === 0;
      return {
        ...current,
        chordproText: text,
        tonalityStart:
          startCurrentlyEmpty && derived.start !== null ? derived.start : current.tonalityStart,
        tonalityEnd:
          endCurrentlyEmpty && derived.end !== null ? derived.end : current.tonalityEnd,
      };
    });
  };

  const addLink = (): void => {
    const trimmed = newLinkUrl.trim();
    if (trimmed.length === 0) return;
    setDraft((current) => ({
      ...current,
      links: [...current.links, { url: trimmed, provider: detectProvider(trimmed), comment: '' }],
    }));
    setNewLinkUrl('');
  };

  const removeLink = (index: number): void => {
    setDraft((current) => ({
      ...current,
      links: current.links.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = draft.title.trim();
    if (trimmed.length === 0) return;
    const baseEnergyValue = draft.baseEnergy.trim().length === 0 ? null : Number(draft.baseEnergy);
    const payload = {
      title: trimmed,
      artist: draft.artist.trim(),
      status: draft.status,
      tonalityStart: draft.tonalityStart.trim().length === 0 ? null : draft.tonalityStart.trim(),
      tonalityEnd: draft.tonalityEnd.trim().length === 0 ? null : draft.tonalityEnd.trim(),
      baseEnergy: baseEnergyValue,
      chart: chartFromDraft(draft),
      links: draft.links,
    };
    try {
      if (isNew) {
        const created = singleSongSchema.parse(
          await apiRequest('/api/songs', { method: 'POST', body: payload }),
        );
        navigate(`/catalog/${created.song.id}`, { replace: true });
      } else {
        await apiRequest(`/api/songs/${songId}`, { method: 'PUT', body: payload });
        navigate(`/catalog/${songId}`);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const remove = async (): Promise<void> => {
    if (songId === undefined || isNew) return;
    try {
      await apiRequest(`/api/songs/${songId}`, { method: 'DELETE' });
      navigate('/catalog', { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  if (loading) {
    return (
      <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>
    );
  }

  const labelClass = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';
  const inputClass = '';

  return (
    <section className="px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
      >
        <Icon name="chevL" size={14} />
        {t('catalog.backToCatalog')}
      </Link>
      <PageHeader
        crumb={draft.artist.length > 0 ? draft.artist : t('catalog.crumb')}
        title={isNew ? t('catalog.newSong') : draft.title}
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

      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {draft.chartKind === 'chordpro' && draft.chordproText.length > 0 ? (
        <Card variant="bare">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
            <Icon name="text" size={14} className="text-ink-500" />
            <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
          </div>
          <div className="p-4">
            <ChordChartViewer source={draft.chordproText} compact />
          </div>
        </Card>
      ) : null}

      <SongExternalLinks links={draft.links} onRemove={removeLink} />

      <Card>
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <label className={labelClass} htmlFor="song-title">
            {t('catalog.songTitle')}
          </label>
          <Input
            id="song-title"
            type="text"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            required
            maxLength={256}
            className={inputClass}
          />

          <label className={labelClass} htmlFor="song-artist">
            {t('catalog.artist')}
          </label>
          <Input
            id="song-artist"
            type="text"
            value={draft.artist}
            onChange={(event) =>
              setDraft((current) => ({ ...current, artist: event.target.value }))
            }
            maxLength={256}
          />

          <label className={labelClass} htmlFor="song-status">
            {t('catalog.status')}
          </label>
          <select
            id="song-status"
            value={draft.status}
            onChange={(event) => {
              const parsed = z.enum(songStatuses).safeParse(event.target.value);
              if (parsed.success) setDraft((current) => ({ ...current, status: parsed.data }));
            }}
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

          <SongChartFields
            chartKind={draft.chartKind}
            chordproText={draft.chordproText}
            pdfS3Key={draft.pdfS3Key}
            imageS3Key={draft.imageS3Key}
            tonalityStart={draft.tonalityStart}
            tonalityEnd={draft.tonalityEnd}
            baseEnergy={draft.baseEnergy}
            onChartKindChange={(kind) => setDraft((current) => ({ ...current, chartKind: kind }))}
            onChordproChange={onChordproChange}
            onPdfKeyChange={(value) => setDraft((current) => ({ ...current, pdfS3Key: value }))}
            onImageKeyChange={(value) => setDraft((current) => ({ ...current, imageS3Key: value }))}
            onTonalityStartChange={(value) =>
              setDraft((current) => ({ ...current, tonalityStart: value }))
            }
            onTonalityEndChange={(value) =>
              setDraft((current) => ({ ...current, tonalityEnd: value }))
            }
            onBaseEnergyChange={(value) =>
              setDraft((current) => ({ ...current, baseEnergy: value }))
            }
          />

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
            <Button type="submit" variant="accent">
              {t('common.save')}
            </Button>
            {!isNew ? (
              <Button type="button" variant="ghost" onClick={() => void remove()}>
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
