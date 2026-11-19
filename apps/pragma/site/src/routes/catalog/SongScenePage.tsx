/** @Feature songs */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SongNotes } from '../../components/molecules/SongNotes';
import { ChordChartSwitcher } from '../../components/organisms/ChordChartSwitcher';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { SceneControls } from '../../components/organisms/SceneControls';
import { openSceneOnAttach } from '../../lib/scene-dialog.adapter';
import {
  attachSceneScrollBody,
  startSceneAutoScroll,
  stopSceneAutoScroll,
} from '../../lib/scene-scroll.adapter';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSong } from '../../lib/queries/songs.queries';
import { selectChordProCharts, selectChordProText } from './chart-kind.utils';
import { useChartSwitch } from './chart-switch.hook';
import { selectHeldInstrumentIds } from './opening-chart.core';
import { selectMissingSongMessageKey } from './missing-song.core';
import { useScenePreferences } from '../../lib/scene-preferences.store';
import { SCENE_BACK_PARAM, selectSceneExitPath } from './scene-view.core';

const NO_CHARTS: readonly never[] = [];
const NO_INSTRUMENTS: readonly never[] = [];
const NO_LINEUP = {};

// @FollowsBlueprint route-detail-page
export function SongScenePage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const { songId } = useParams<{ songId: string }>();
  const [searchParams] = useSearchParams();
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const preferences = useScenePreferences(songId);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const song = songQuery.data?.song ?? null;
  const signedInMember = useSignedInMember();
  const instrumentsQuery = useInstrumentsList();
  const instruments = instrumentsQuery.data?.instruments ?? NO_INSTRUMENTS;
  const chordProCharts = selectChordProCharts(song?.charts ?? NO_CHARTS);
  const chartSwitch = useChartSwitch(
    chordProCharts,
    selectHeldInstrumentIds(song?.defaultLineup ?? NO_LINEUP, signedInMember.data),
    'song-scene',
  );

  if (songQuery.isLoading) {
    return <p className="px-9 py-7 text-ink-soft italic text-meta">{t('common.loading')}</p>;
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

  const chordproText = selectChordProText(chordProCharts[chartSwitch.shownIndex]);
  const leaveScene = (): void => {
    stopSceneAutoScroll();
    navigateTo(selectSceneExitPath(song.id, searchParams.get(SCENE_BACK_PARAM)));
  };

  const toggleAutoScroll = (): void => {
    if (isAutoScrolling) {
      stopSceneAutoScroll();
      setIsAutoScrolling(false);
      return;
    }
    startSceneAutoScroll(preferences.scrollSpeedPxPerSecond);
    setIsAutoScrolling(true);
  };

  const changeScrollSpeed = (delta: number): void => {
    const speed = preferences.saveScrollSpeed(preferences.scrollSpeedPxPerSecond + delta);
    if (isAutoScrolling) startSceneAutoScroll(speed);
  };

  return (
    // eslint-disable-next-line borso/no-raw-interactive-element -- the scene view is a full-screen stage, not a sheet: no grabber, no title bar, its own dark tokens and its own transport, opened through openSceneOnAttach
    <dialog
      ref={openSceneOnAttach}
      onClose={leaveScene}
      aria-label={song.title}
      className="fixed inset-0 z-50 m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-stage-bg text-stage-ink overflow-hidden p-0 flex flex-col"
    >
      <header className="shrink-0 px-4 sm:px-10 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 border-b border-stage-line">
        <h2 className="font-display text-stage-title sm:text-stage-hero text-stage-ink m-0 truncate">
          {song.title}
        </h2>
        <ChordChartSwitcher
          charts={chordProCharts}
          instruments={instruments}
          shownIndex={chartSwitch.shownIndex}
          onPick={chartSwitch.pick}
          tone="stage"
          className="mt-2"
        />
      </header>
      <div
        ref={attachSceneScrollBody}
        className="flex-1 overflow-y-auto px-4 sm:px-10 py-5"
        style={{ fontSize: `${preferences.fontSizePx}px` }}
      >
        <SongNotes song={song} tone="dark" className="mb-5" />
        {chordproText === null ? (
          <p className="text-center font-display text-title text-stage-ink-dim py-20">
            {t('scene.noChordpro')}
          </p>
        ) : (
          <ChordChartViewer source={chordproText} semitones={preferences.semitones} tone="dark" />
        )}
      </div>
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 sm:px-10 py-3 border-t border-stage-line bg-stage-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button variant="stage" size="sm" onClick={leaveScene} icon="chevL">
          {t('common.back')}
        </Button>
        {chordproText === null ? null : (
          <div className="ml-auto">
            <SceneControls
              semitones={preferences.semitones}
              fontSizePx={preferences.fontSizePx}
              scrollSpeedPxPerSecond={preferences.scrollSpeedPxPerSecond}
              isAutoScrolling={isAutoScrolling}
              onTransposeBy={preferences.transposeBy}
              onZoomBy={preferences.zoomBy}
              onScrollSpeedBy={changeScrollSpeed}
              onToggleAutoScroll={toggleAutoScroll}
            />
          </div>
        )}
      </div>
    </dialog>
  );
}
