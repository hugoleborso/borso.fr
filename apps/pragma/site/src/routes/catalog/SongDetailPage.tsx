/**
 * Per-song detail + create page. URL `:songId === 'new'` triggers the
 * create flow; any UUID loads the existing song and edits it in place.
 *
 * The form covers the spec's `Song` interface: title, artist, status,
 * tonality, base energy, external links (rendered via SongExternalLinks
 * + embed.utils), and the chord-chart variant. ChordPro charts get an
 * inline preview + a "Mode Scène" link to the fullscreen viewer.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
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

export function SongDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const isNew = songId === 'new';
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

  if (loading) return <p className="admin-page-loading">{t('common.loading')}</p>;

  return (
    <section className="song-detail-page">
      <Link className="back-link" to="/catalog">
        {t('common.back')}
      </Link>
      <h2 className="admin-page-title">{isNew ? t('catalog.newSong') : draft.title}</h2>
      {!isNew && songId !== undefined ? (
        <Link className="song-detail-scene-link" to={`/catalog/${songId}/scene`}>
          {t('catalog.openScene')}
        </Link>
      ) : null}
      {error !== null ? <p className="admin-page-error">{error}</p> : null}

      {draft.chartKind === 'chordpro' && draft.chordproText.length > 0 ? (
        <section className="song-detail-preview">
          <h3 className="song-detail-section-title">{t('catalog.previewTitle')}</h3>
          <ChordChartViewer source={draft.chordproText} compact />
        </section>
      ) : null}

      <SongExternalLinks links={draft.links} onRemove={removeLink} />

      <form onSubmit={submit} className="song-detail-form">
        <label className="admin-page-form-label" htmlFor="song-title">
          {t('catalog.songTitle')}
        </label>
        <input
          id="song-title"
          type="text"
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          required
          maxLength={256}
          className="admin-page-form-input"
        />

        <label className="admin-page-form-label" htmlFor="song-artist">
          {t('catalog.artist')}
        </label>
        <input
          id="song-artist"
          type="text"
          value={draft.artist}
          onChange={(event) => setDraft((current) => ({ ...current, artist: event.target.value }))}
          maxLength={256}
          className="admin-page-form-input"
        />

        <label className="admin-page-form-label" htmlFor="song-status">
          {t('catalog.status')}
        </label>
        <select
          id="song-status"
          value={draft.status}
          onChange={(event) => {
            const parsed = z.enum(songStatuses).safeParse(event.target.value);
            if (parsed.success) setDraft((current) => ({ ...current, status: parsed.data }));
          }}
          className="admin-page-form-input"
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

        <fieldset className="admin-page-form-fieldset">
          <legend>{t('catalog.linksTitle')}</legend>
          <div className="song-detail-link-add">
            <input
              type="url"
              placeholder={t('catalog.linkPlaceholder')}
              value={newLinkUrl}
              onChange={(event) => setNewLinkUrl(event.target.value)}
              className="admin-page-form-input"
            />
            <button type="button" onClick={addLink} className="admin-page-form-submit">
              {t('common.add')}
            </button>
          </div>
        </fieldset>

        <div className="admin-page-form-actions">
          <button type="submit" className="admin-page-form-submit">
            {t('common.save')}
          </button>
          {!isNew ? (
            <button type="button" className="admin-page-form-cancel" onClick={() => void remove()}>
              {t('common.delete')}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
