/**
 * Per-song detail + create page. URL `:songId === 'new'` triggers the
 * create flow; any UUID loads the existing song and edits it in place.
 *
 * The form covers the spec's `Song` interface: title, artist, status,
 * tonality (start + end), base energy, and the chord chart variant
 * (chordpro text, pdf s3 key, or image s3 key). The upload UX is a
 * stub — the back-end returns a synthetic key (CDK item 9 wires the
 * real S3 PUT).
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { deriveTonality } from '../../lib/tonality-bridge';

const songStatuses = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.enum(songStatuses),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  baseEnergy: z.number().nullable(),
  chart: z
    .union([
      z.object({ kind: z.literal('chordpro'), text: z.string() }),
      z.object({ kind: z.literal('pdf'), s3Key: z.string() }),
      z.object({ kind: z.literal('image'), s3Key: z.string() }),
    ])
    .nullable(),
});
const singleSchema = z.object({ song: songSchema });

type Song = z.infer<typeof songSchema>;
type SongStatus = (typeof songStatuses)[number];

type ChartKind = 'none' | 'chordpro' | 'pdf' | 'image';

interface DraftState {
  title: string;
  artist: string;
  status: SongStatus;
  tonalityStart: string;
  tonalityEnd: string;
  baseEnergy: string;
  chartKind: ChartKind;
  chordproText: string;
  pdfS3Key: string;
  imageS3Key: string;
}

const BLANK_DRAFT: DraftState = {
  title: '',
  artist: '',
  status: 'idea',
  tonalityStart: '',
  tonalityEnd: '',
  baseEnergy: '',
  chartKind: 'none',
  chordproText: '',
  pdfS3Key: '',
  imageS3Key: '',
};

function fromSong(song: Song): DraftState {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    tonalityStart: song.tonalityStart ?? '',
    tonalityEnd: song.tonalityEnd ?? '',
    baseEnergy: song.baseEnergy === null ? '' : String(song.baseEnergy),
    chartKind: song.chart === null ? 'none' : song.chart.kind,
    chordproText: song.chart !== null && song.chart.kind === 'chordpro' ? song.chart.text : '',
    pdfS3Key: song.chart !== null && song.chart.kind === 'pdf' ? song.chart.s3Key : '',
    imageS3Key: song.chart !== null && song.chart.kind === 'image' ? song.chart.s3Key : '',
  };
}

function chartFromDraft(draft: DraftState): Song['chart'] {
  if (draft.chartKind === 'none') return null;
  if (draft.chartKind === 'chordpro') return { kind: 'chordpro', text: draft.chordproText };
  if (draft.chartKind === 'pdf') return { kind: 'pdf', s3Key: draft.pdfS3Key };
  return { kind: 'image', s3Key: draft.imageS3Key };
}

export function SongDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const isNew = songId === 'new';
  const [draft, setDraft] = useState<DraftState>(BLANK_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);

  const load = useCallback(async (): Promise<void> => {
    if (isNew || songId === undefined) return;
    setLoading(true);
    try {
      const body = singleSchema.parse(await apiRequest(`/api/songs/${songId}`));
      setDraft(fromSong(body.song));
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
        // Only auto-fill empty tonality fields — never overwrite an
        // operator's manual choice. The spec's "user can override"
        // requirement makes this directional.
        tonalityStart:
          startCurrentlyEmpty && derived.start !== null ? derived.start : current.tonalityStart,
        tonalityEnd:
          endCurrentlyEmpty && derived.end !== null ? derived.end : current.tonalityEnd,
      };
    });
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
    };
    try {
      if (isNew) {
        const created = singleSchema.parse(
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
      <h2 className="admin-page-title">
        {isNew ? t('catalog.newSong') : draft.title}
      </h2>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
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
            if (parsed.success) {
              setDraft((current) => ({ ...current, status: parsed.data }));
            }
          }}
          className="admin-page-form-input"
        >
          {songStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`catalog.status${status.charAt(0).toUpperCase() + status.slice(1).replace('_r', 'R').replace('_', '')}`)}
            </option>
          ))}
        </select>

        <label className="admin-page-form-label" htmlFor="song-tonality-start">
          {t('catalog.tonalityStart')}
        </label>
        <input
          id="song-tonality-start"
          type="text"
          value={draft.tonalityStart}
          onChange={(event) =>
            setDraft((current) => ({ ...current, tonalityStart: event.target.value }))
          }
          maxLength={16}
          className="admin-page-form-input"
        />

        <label className="admin-page-form-label" htmlFor="song-tonality-end">
          {t('catalog.tonalityEnd')}
        </label>
        <input
          id="song-tonality-end"
          type="text"
          value={draft.tonalityEnd}
          onChange={(event) =>
            setDraft((current) => ({ ...current, tonalityEnd: event.target.value }))
          }
          maxLength={16}
          className="admin-page-form-input"
        />

        <label className="admin-page-form-label" htmlFor="song-base-energy">
          {t('catalog.baseEnergy')}
        </label>
        <input
          id="song-base-energy"
          type="number"
          min={1}
          max={10}
          value={draft.baseEnergy}
          onChange={(event) =>
            setDraft((current) => ({ ...current, baseEnergy: event.target.value }))
          }
          className="admin-page-form-input"
        />

        <fieldset className="admin-page-form-fieldset">
          <legend>{t('catalog.chordChart')}</legend>
          <label className="admin-page-form-checkbox">
            <input
              type="radio"
              name="chart-kind"
              checked={draft.chartKind === 'none'}
              onChange={() => setDraft((current) => ({ ...current, chartKind: 'none' }))}
            />
            —
          </label>
          <label className="admin-page-form-checkbox">
            <input
              type="radio"
              name="chart-kind"
              checked={draft.chartKind === 'chordpro'}
              onChange={() => setDraft((current) => ({ ...current, chartKind: 'chordpro' }))}
            />
            {t('catalog.chartChordpro')}
          </label>
          <label className="admin-page-form-checkbox">
            <input
              type="radio"
              name="chart-kind"
              checked={draft.chartKind === 'pdf'}
              onChange={() => setDraft((current) => ({ ...current, chartKind: 'pdf' }))}
            />
            {t('catalog.chartPdf')}
          </label>
          <label className="admin-page-form-checkbox">
            <input
              type="radio"
              name="chart-kind"
              checked={draft.chartKind === 'image'}
              onChange={() => setDraft((current) => ({ ...current, chartKind: 'image' }))}
            />
            {t('catalog.chartImage')}
          </label>
          {draft.chartKind === 'chordpro' ? (
            <textarea
              value={draft.chordproText}
              onChange={(event) => onChordproChange(event.target.value)}
              className="admin-page-form-input chordpro-textarea"
              rows={10}
              maxLength={64_000}
            />
          ) : null}
          {draft.chartKind === 'pdf' ? (
            <input
              type="text"
              value={draft.pdfS3Key}
              onChange={(event) =>
                setDraft((current) => ({ ...current, pdfS3Key: event.target.value }))
              }
              className="admin-page-form-input"
              placeholder="pdf s3 key"
            />
          ) : null}
          {draft.chartKind === 'image' ? (
            <input
              type="text"
              value={draft.imageS3Key}
              onChange={(event) =>
                setDraft((current) => ({ ...current, imageS3Key: event.target.value }))
              }
              className="admin-page-form-input"
              placeholder="image s3 key"
            />
          ) : null}
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
