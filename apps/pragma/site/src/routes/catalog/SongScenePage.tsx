/**
 * Stage view — fullscreen chord-chart viewer for a single song.
 * Spec design-bundle §5: black background, large chord grid,
 * transposable, A−/A+ zoom, keyboard nav.
 *
 * The surface is a native modal `<dialog>`, so the browser owns the
 * top layer, the focus trap, and the Escape key. Escape fires `close`,
 * which navigates back to the song detail page, and no key listener is
 * attached by hand.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { SongNotes } from '../../components/molecules/SongNotes';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { ApiError } from '../../lib/api';
import { openDialogOnAttach } from '../../lib/modal-dialog';
import { useNavigateTo } from '../../lib/navigation';
import { useSong } from '../../lib/queries/songs';
import { selectChordProText } from './chart-kind.utils';
import {
  clampSceneFontSize,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_DEFAULT_PX,
  SCENE_FONT_SIZE_STEP_PX,
} from './scene-view.core';

const SCENE_BUTTON_CLASS =
  'bg-[rgba(255,255,255,0.08)] text-[#f1e9d8] border border-[rgba(255,255,255,0.14)] px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-[rgba(255,255,255,0.14)] transition-colors';

// @FollowsBlueprint route-detail-page
export function SongScenePage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const { songId } = useParams<{ songId: string }>();
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const [semitones, setSemitones] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(SCENE_FONT_SIZE_DEFAULT_PX);

  const song = songQuery.data?.song ?? null;
  const error = songQuery.error instanceof ApiError ? songQuery.error.message : null;

  if (error !== null) {
    return (
      <p className="px-9 py-7 text-danger text-sm" role="alert">
        {error}
      </p>
    );
  }
  if (song === null) {
    return <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  const chordproText = selectChordProText(song.chart);
  const leaveScene = (): void => {
    navigateTo(`/catalog/${song.id}`);
  };
  const stepFontSize = (deltaPx: number): void => {
    setFontSizePx((current) => clampSceneFontSize(current + deltaPx));
  };

  return (
    <dialog
      ref={openDialogOnAttach}
      onClose={leaveScene}
      aria-label={song.title}
      className="fixed inset-0 z-50 m-0 w-screen h-screen max-w-none max-h-none border-0 bg-[#0d0a07] text-[#f1e9d8] overflow-y-auto p-4 sm:p-10 flex flex-col"
      style={{ fontSize: `${fontSizePx}px` }}
    >
      <header className="flex items-center gap-2 sm:gap-4 mb-5 pb-4 border-b border-[rgba(255,255,255,0.08)] flex-wrap">
        <button type="button" className={SCENE_BUTTON_CLASS} onClick={leaveScene}>
          ← {t('common.back')}
        </button>
        <h2 className="font-display italic text-2xl sm:text-4xl text-[#f1e9d8] m-0 flex-1 min-w-0 truncate">
          {song.title}
        </h2>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            className={SCENE_BUTTON_CLASS}
            onClick={() => setSemitones((current) => current - 1)}
            aria-label={t('scene.transposeDown')}
          >
            -1
          </button>
          <span className="font-mono text-sm text-[rgba(241,233,216,0.7)] px-2">
            {formatSemitoneOffset(semitones)}
          </span>
          <button
            type="button"
            className={SCENE_BUTTON_CLASS}
            onClick={() => setSemitones((current) => current + 1)}
            aria-label={t('scene.transposeUp')}
          >
            +1
          </button>
          <button
            type="button"
            className={SCENE_BUTTON_CLASS}
            onClick={() => stepFontSize(-SCENE_FONT_SIZE_STEP_PX)}
            aria-label={t('scene.zoomOut')}
          >
            A−
          </button>
          <button
            type="button"
            className={SCENE_BUTTON_CLASS}
            onClick={() => stepFontSize(SCENE_FONT_SIZE_STEP_PX)}
            aria-label={t('scene.zoomIn')}
          >
            A+
          </button>
        </div>
      </header>
      <SongNotes song={song} tone="dark" className="mb-5" />
      {chordproText === null ? (
        <p className="text-center font-display italic text-2xl text-[rgba(241,233,216,0.5)] py-20">
          {t('scene.noChordpro')}
        </p>
      ) : (
        <ChordChartViewer source={chordproText} semitones={semitones} />
      )}
    </dialog>
  );
}
