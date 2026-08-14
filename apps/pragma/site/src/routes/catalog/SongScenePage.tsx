/**
 * Stage view — fullscreen chord-chart viewer for a single song.
 * Spec design-bundle §5: black background, large chord grid,
 * transposable, A−/A+ zoom, keyboard nav.
 *
 * The surface is a native modal `<dialog>`, so the browser owns the
 * top layer, the focus trap, and the Escape key. Escape fires `close`,
 * which navigates back to the song detail page, and no key listener is
 * attached by hand.
 *
 * Only the chart scrolls: the dialog is a flex column whose middle band
 * is the scroll container, so the title stays at the top and the
 * controls at the bottom whatever the chart's height. They used to ride
 * with the chart, and at a font size you can read at arm's length that
 * put every control — including the only way out, since a phone has no
 * Escape key — off screen for 93% of the scroll range. The bottom edge
 * is also where a thumb reaches while the other hand is on the neck.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SongNotes } from '../../components/molecules/SongNotes';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { openDialogOnAttach } from '../../lib/modal-dialog';
import { useNavigateTo } from '../../lib/navigation';
import { useSong } from '../../lib/queries/songs';
import { selectChordProText } from './chart-kind.utils';
import { selectMissingSongMessageKey } from './missing-song.core';
import {
  clampSceneFontSize,
  clampSemitoneOffset,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_DEFAULT_PX,
  SCENE_FONT_SIZE_MAX_PX,
  SCENE_FONT_SIZE_MIN_PX,
  SCENE_FONT_SIZE_STEP_PX,
  SCENE_TRANSPOSE_MAX_SEMITONES,
  SCENE_TRANSPOSE_MIN_SEMITONES,
} from './scene-view.core';

const SCENE_BUTTON_CLASS =
  'inline-flex items-center justify-center min-w-11 min-h-11 bg-[rgba(255,255,255,0.08)] text-stage-ink border border-[rgba(255,255,255,0.14)] px-3 rounded-md text-sm cursor-pointer hover:bg-[rgba(255,255,255,0.14)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const SCENE_BAR_CLASS =
  'shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-10 py-3 border-t border-[rgba(255,255,255,0.08)] bg-stage-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))]';

// @FollowsBlueprint route-detail-page
export function SongScenePage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const { songId } = useParams<{ songId: string }>();
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const [semitones, setSemitones] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(SCENE_FONT_SIZE_DEFAULT_PX);

  const song = songQuery.data?.song ?? null;

  if (songQuery.isLoading) {
    return <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }
  if (song === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSongMessageKey(songQuery.error))}
        backTo="/catalog"
        backLabel={t('catalog.backToCatalog')}
      />
    );
  }

  const chordproText = selectChordProText(song.chart);
  const leaveScene = (): void => {
    navigateTo(`/catalog/${song.id}`);
  };
  const stepFontSize = (deltaPx: number): void => {
    setFontSizePx((current) => clampSceneFontSize(current + deltaPx));
  };

  const stepSemitones = (delta: number): void => {
    setSemitones((current) => clampSemitoneOffset(current + delta));
  };

  return (
    <dialog
      ref={openDialogOnAttach}
      onClose={leaveScene}
      aria-label={song.title}
      className="fixed inset-0 z-50 m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-stage-bg text-stage-ink overflow-hidden p-0 flex flex-col"
    >
      <header className="shrink-0 px-4 sm:px-10 pt-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
        <h2 className="font-display italic text-2xl sm:text-4xl text-stage-ink m-0 truncate">
          {song.title}
        </h2>
      </header>
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-10 py-5"
        style={{ fontSize: `${fontSizePx}px` }}
      >
        <SongNotes song={song} tone="dark" className="mb-5" />
        {chordproText === null ? (
          <p className="text-center font-display italic text-2xl text-stage-ink-dim py-20">
            {t('scene.noChordpro')}
          </p>
        ) : (
          <ChordChartViewer source={chordproText} semitones={semitones} tone="dark" />
        )}
      </div>
      <div className={SCENE_BAR_CLASS}>
        <button type="button" className={SCENE_BUTTON_CLASS} onClick={leaveScene}>
          ← {t('common.back')}
        </button>
        {chordproText === null ? null : (
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <button
              type="button"
              className={SCENE_BUTTON_CLASS}
              onClick={() => stepSemitones(-1)}
              disabled={semitones <= SCENE_TRANSPOSE_MIN_SEMITONES}
              aria-label={t('scene.transposeDown')}
            >
              -1
            </button>
            <span className="font-mono text-sm text-stage-ink-dim px-1">
              {formatSemitoneOffset(semitones)}
            </span>
            <button
              type="button"
              className={SCENE_BUTTON_CLASS}
              onClick={() => stepSemitones(1)}
              disabled={semitones >= SCENE_TRANSPOSE_MAX_SEMITONES}
              aria-label={t('scene.transposeUp')}
            >
              +1
            </button>
            <button
              type="button"
              className={SCENE_BUTTON_CLASS}
              onClick={() => stepFontSize(-SCENE_FONT_SIZE_STEP_PX)}
              disabled={fontSizePx <= SCENE_FONT_SIZE_MIN_PX}
              aria-label={t('scene.zoomOut')}
            >
              A−
            </button>
            <button
              type="button"
              className={SCENE_BUTTON_CLASS}
              onClick={() => stepFontSize(SCENE_FONT_SIZE_STEP_PX)}
              disabled={fontSizePx >= SCENE_FONT_SIZE_MAX_PX}
              aria-label={t('scene.zoomIn')}
            >
              A+
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
