/** @Feature songs */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SongNotes } from '../../components/molecules/SongNotes';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { SceneControls } from '../../components/organisms/SceneControls';
import { openSceneOnAttach } from '../../lib/scene-dialog.adapter';
import {
  attachSceneScrollBody,
  startSceneAutoScroll,
  stopSceneAutoScroll,
} from '../../lib/scene-scroll.adapter';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSong } from '../../lib/queries/songs.queries';
import { selectChordProText } from './chart-kind.utils';
import { selectMissingSongMessageKey } from './missing-song.core';
import {
  clampSceneFontSize,
  clampSceneScrollSpeed,
  clampSemitoneOffset,
  SCENE_FONT_SIZE_DEFAULT_PX,
  SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
} from './scene-view.core';

// @FollowsBlueprint route-detail-page
export function SongScenePage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const { songId } = useParams<{ songId: string }>();
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const [semitones, setSemitones] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(SCENE_FONT_SIZE_DEFAULT_PX);
  const [scrollSpeed, setScrollSpeed] = useState(SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

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
    stopSceneAutoScroll();
    navigateTo(`/catalog/${song.id}`);
  };

  const toggleAutoScroll = (): void => {
    if (isAutoScrolling) {
      stopSceneAutoScroll();
      setIsAutoScrolling(false);
      return;
    }
    startSceneAutoScroll(scrollSpeed);
    setIsAutoScrolling(true);
  };

  const changeScrollSpeed = (delta: number): void => {
    const speed = clampSceneScrollSpeed(scrollSpeed + delta);
    setScrollSpeed(speed);
    if (isAutoScrolling) startSceneAutoScroll(speed);
  };

  return (
    <dialog
      ref={openSceneOnAttach}
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
        ref={attachSceneScrollBody}
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
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 sm:px-10 py-3 border-t border-[rgba(255,255,255,0.08)] bg-stage-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button variant="stage" size="sm" onClick={leaveScene}>
          <Icon name="chevL" size={14} />
          {t('common.back')}
        </Button>
        {chordproText === null ? null : (
          <div className="ml-auto">
            <SceneControls
              semitones={semitones}
              fontSizePx={fontSizePx}
              scrollSpeedPxPerSecond={scrollSpeed}
              isAutoScrolling={isAutoScrolling}
              onTransposeBy={(delta) => setSemitones(clampSemitoneOffset(semitones + delta))}
              onZoomBy={(delta) => setFontSizePx(clampSceneFontSize(fontSizePx + delta))}
              onScrollSpeedBy={changeScrollSpeed}
              onToggleAutoScroll={toggleAutoScroll}
            />
          </div>
        )}
      </div>
    </dialog>
  );
}
