/**
 * Mode Scène — fullscreen chord-chart viewer for a single song.
 * Spec design-bundle §5: black background, large chord grid,
 * transposable, A−/A+ zoom, keyboard nav. v1 surface lands the
 * transposer + zoom; the song-pill carousel for setlist mode is a
 * follow-up surface (lives on the setlist Mode Scène — not in this
 * route).
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { ApiError, apiRequest } from '../../lib/api-client';

const sceneSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  chart: z
    .union([
      z.object({ kind: z.literal('chordpro'), text: z.string() }),
      z.object({ kind: z.literal('pdf'), s3Key: z.string() }),
      z.object({ kind: z.literal('image'), s3Key: z.string() }),
    ])
    .nullable(),
});
const sceneSchema = z.object({ song: sceneSongSchema });
type SceneSong = z.infer<typeof sceneSongSchema>;

const FONT_SIZE_MIN_PX = 16;
const FONT_SIZE_MAX_PX = 48;
const FONT_SIZE_STEP_PX = 2;
const FONT_SIZE_DEFAULT_PX = 24;

export function SongScenePage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { songId } = useParams<{ songId: string }>();
  const [song, setSong] = useState<SceneSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT_PX);

  const load = useCallback(async (): Promise<void> => {
    if (songId === undefined) return;
    try {
      const body = sceneSchema.parse(await apiRequest(`/api/songs/${songId}`));
      setSong(body.song);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  }, [songId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ESC closes Mode Scène — the prototype's fullscreen takeover wires
  // the same key (setlist.jsx line 443). Adding it here matches the
  // muscle memory bandmates already have from the demo.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (songId === undefined) return;
      navigate(`/catalog/${songId}`);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, songId]);

  const decrementFontSize = (): void => {
    setFontSize((current) => Math.max(FONT_SIZE_MIN_PX, current - FONT_SIZE_STEP_PX));
  };
  const incrementFontSize = (): void => {
    setFontSize((current) => Math.min(FONT_SIZE_MAX_PX, current + FONT_SIZE_STEP_PX));
  };

  if (error !== null) {
    return (
      <p className="px-9 py-7 text-danger text-sm" role="alert">
        {error}
      </p>
    );
  }
  if (song === null) {
    return (
      <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>
    );
  }

  const hasChordpro = song.chart !== null && song.chart.kind === 'chordpro';
  const sceneButtonClass =
    'bg-[rgba(255,255,255,0.08)] text-[#f1e9d8] border border-[rgba(255,255,255,0.14)] px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-[rgba(255,255,255,0.14)] transition-colors';

  return (
    <section
      className="fixed inset-0 z-50 bg-[#0d0a07] text-[#f1e9d8] overflow-y-auto p-10 grid grid-rows-[auto_1fr]"
      style={{ fontSize: `${fontSize}px` }}
    >
      <header className="flex items-center gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <button
          type="button"
          className={sceneButtonClass}
          onClick={() => navigate(`/catalog/${song.id}`)}
        >
          ← {t('common.back')}
        </button>
        <h2 className="font-display italic text-4xl text-[#f1e9d8] m-0 flex-1 truncate">
          {song.title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={sceneButtonClass}
            onClick={() => setSemitones((current) => current - 1)}
            aria-label={t('scene.transposeDown')}
          >
            -1
          </button>
          <span className="font-mono text-sm text-[rgba(241,233,216,0.7)] px-2">
            {semitones >= 0 ? `+${semitones}` : `${semitones}`}
          </span>
          <button
            type="button"
            className={sceneButtonClass}
            onClick={() => setSemitones((current) => current + 1)}
            aria-label={t('scene.transposeUp')}
          >
            +1
          </button>
          <button
            type="button"
            className={sceneButtonClass}
            onClick={decrementFontSize}
            aria-label={t('scene.zoomOut')}
          >
            A−
          </button>
          <button
            type="button"
            className={sceneButtonClass}
            onClick={incrementFontSize}
            aria-label={t('scene.zoomIn')}
          >
            A+
          </button>
        </div>
      </header>
      {hasChordpro && song.chart !== null && song.chart.kind === 'chordpro' ? (
        <ChordChartViewer source={song.chart.text} semitones={semitones} />
      ) : (
        <p className="text-center font-display italic text-2xl text-[rgba(241,233,216,0.5)] py-20">
          {t('scene.noChordpro')}
        </p>
      )}
    </section>
  );
}
