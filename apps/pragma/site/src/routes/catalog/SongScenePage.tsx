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

  const decrementFontSize = (): void => {
    setFontSize((current) => Math.max(FONT_SIZE_MIN_PX, current - FONT_SIZE_STEP_PX));
  };
  const incrementFontSize = (): void => {
    setFontSize((current) => Math.min(FONT_SIZE_MAX_PX, current + FONT_SIZE_STEP_PX));
  };

  if (error !== null) return <p className="admin-page-error">{error}</p>;
  if (song === null) return <p className="admin-page-loading">{t('common.loading')}</p>;

  const hasChordpro = song.chart !== null && song.chart.kind === 'chordpro';

  return (
    <section className="scene-page" style={{ fontSize: `${fontSize}px` }}>
      <header className="scene-page-header">
        <button
          type="button"
          className="scene-page-back"
          onClick={() => navigate(`/catalog/${song.id}`)}
        >
          {t('common.back')}
        </button>
        <h2 className="scene-page-title">{song.title}</h2>
        <div className="scene-page-controls">
          <button
            type="button"
            onClick={() => setSemitones((current) => current - 1)}
            aria-label={t('scene.transposeDown')}
          >
            -1
          </button>
          <span className="scene-page-transpose">
            {semitones >= 0 ? `+${semitones}` : `${semitones}`}
          </span>
          <button
            type="button"
            onClick={() => setSemitones((current) => current + 1)}
            aria-label={t('scene.transposeUp')}
          >
            +1
          </button>
          <button type="button" onClick={decrementFontSize} aria-label={t('scene.zoomOut')}>
            A−
          </button>
          <button type="button" onClick={incrementFontSize} aria-label={t('scene.zoomIn')}>
            A+
          </button>
        </div>
      </header>
      {hasChordpro && song.chart !== null && song.chart.kind === 'chordpro' ? (
        <ChordChartViewer source={song.chart.text} semitones={semitones} />
      ) : (
        <p className="scene-page-empty">{t('scene.noChordpro')}</p>
      )}
    </section>
  );
}
