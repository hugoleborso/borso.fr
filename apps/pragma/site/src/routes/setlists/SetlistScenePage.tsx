/** @Feature setlists */

import type { JSX, KeyboardEvent } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SongNotes } from '../../components/molecules/SongNotes';
import { ChordChartSwitcher } from '../../components/organisms/ChordChartSwitcher';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { SceneControls } from '../../components/organisms/SceneControls';
import { SceneTransitionPreview } from '../../components/organisms/SceneTransitionPreview';
import { SceneTransport } from '../../components/organisms/SceneTransport';
import { openSceneOnAttach } from '../../lib/scene-dialog.adapter';
import {
  attachSceneScrollBody,
  scrollSceneBodyToTop,
  startSceneAutoScroll,
  stopSceneAutoScroll,
} from '../../lib/scene-scroll.adapter';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { resolveLineup } from '@domain/lineup.core';
import { selectChordProCharts, selectChordProText } from '../catalog/chart-kind.utils';
import { useChartSwitch } from '../catalog/chart-switch.hook';
import { selectHeldInstrumentIds } from '../catalog/opening-chart.core';
import {
  clampSceneFontSize,
  clampSceneScrollSpeed,
  clampSemitoneOffset,
  SCENE_FONT_SIZE_DEFAULT_PX,
  SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
} from '../catalog/scene-view.core';
import {
  buildSceneHeadline,
  buildScenePills,
  clampSceneIndex,
  computeSceneProgressPercent,
  formatScenePosition,
  resolveSceneIndex,
  selectSceneKeyCommand,
} from './setlist-scene.core';
import { selectMissingSetlistMessageKey } from './missing-setlist.core';
import { useSceneSwipe } from './scene-swipe.hook';
import { useSceneTransitionCard } from './scene-transition-card.hook';
import { useSceneTransitionPreview } from './scene-transition.hook';

const NO_ROWS: readonly never[] = [];
const NO_LINEUP = {};
const CAPTION_CLASS = 'text-label tracking-[0.18em] uppercase text-stage-ink-dim m-0';

export function SetlistScenePage(): JSX.Element {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { t } = useTranslation();
  if (setlistId === undefined) {
    return <p className="px-4 sm:px-9 py-4 sm:py-7 text-danger">{t('setlist.missingId')}</p>;
  }
  return <SetlistScene setlistId={setlistId} />;
}

// @FollowsBlueprint route-detail-page
function SetlistScene({ setlistId }: { readonly setlistId: string }): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const setlistQuery = useSetlist(setlistId);
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const signedInMember = useSignedInMember();
  const instrumentsQuery = useInstrumentsList();
  const transitionCard = useSceneTransitionCard();

  const [index, setIndex] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(SCENE_FONT_SIZE_DEFAULT_PX);
  const [scrollSpeed, setScrollSpeed] = useState(SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const setlistEntries = entriesQuery.data?.entries ?? NO_ROWS;
  const songs = songsQuery.data?.songs ?? NO_ROWS;
  const setlist = setlistQuery.data?.setlist ?? null;

  const songsById = useMemo(() => {
    const found: Record<string, (typeof songs)[number] | undefined> = {};
    for (const song of songs) found[song.id] = song;
    return found;
  }, [songs]);

  const currentIndex = clampSceneIndex(index, setlistEntries.length);
  const entry = setlistEntries[currentIndex];
  const song = entry === undefined ? undefined : songsById[entry.songId];
  const instruments = instrumentsQuery.data?.instruments ?? NO_ROWS;
  const chordProCharts = selectChordProCharts(song?.charts ?? NO_ROWS);
  const entryLineup = resolveLineup(
    song?.defaultLineup ?? NO_LINEUP,
    entry?.lineupOverride ?? null,
  );
  const chartSwitch = useChartSwitch(
    chordProCharts,
    selectHeldInstrumentIds(entryLineup, signedInMember.data),
    'setlist-scene',
    entry?.songId,
  );
  const transitionPreview = useSceneTransitionPreview({
    song,
    nextEntry: setlistEntries[currentIndex + 1],
    songsById,
    currentLineup: entryLineup,
    instruments,
  });
  const pills = useMemo(
    () => buildScenePills(setlistEntries, songsById, currentIndex),
    [setlistEntries, songsById, currentIndex],
  );

  const leaveScene = (): void => {
    stopSceneAutoScroll();
    navigateTo(`/setlists/${setlistId}`);
  };

  const goToIndex = (nextIndex: number): void => {
    setIndex(clampSceneIndex(nextIndex, setlistEntries.length));
    setSemitones(0);
    chartSwitch.resetPick();
    scrollSceneBodyToTop();
  };

  const swipeHandlers = useSceneSwipe((command) =>
    goToIndex(resolveSceneIndex(command, currentIndex, setlistEntries.length)),
  );

  const readKey = (event: KeyboardEvent<HTMLDialogElement>): void => {
    const command = selectSceneKeyCommand(event.key);
    if (command === null) return;
    event.preventDefault();
    goToIndex(resolveSceneIndex(command, currentIndex, setlistEntries.length));
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

  if (entriesQuery.isLoading || setlistQuery.isLoading) {
    return <p className="px-9 py-7 text-ink-soft italic text-meta">{t('common.loading')}</p>;
  }

  if (setlist === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSetlistMessageKey(setlistQuery.error))}
        backTo="/setlists"
        backLabel={t('setlist.title')}
      />
    );
  }

  const headline = buildSceneHeadline(entry, song);
  const chordproText = selectChordProText(chordProCharts[chartSwitch.shownIndex]);
  const setlistName = selectSetlistDisplayName(setlist.name, t('setlist.untitled'));

  return (
    // eslint-disable-next-line borso/no-raw-interactive-element -- the scene view is a full-screen stage, not a sheet: no grabber, no title bar, its own dark tokens and its own transport, opened through openSceneOnAttach
    <dialog
      ref={openSceneOnAttach}
      onClose={leaveScene}
      onKeyDown={readKey}
      aria-label={t('scene.title')}
      className="fixed inset-0 z-50 m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-stage-bg text-stage-ink overflow-hidden p-0 flex flex-col"
    >
      <header className="shrink-0 flex flex-col gap-3 px-4 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 border-b border-stage-line lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button
            variant="stage"
            size="sm"
            onClick={leaveScene}
            className="shrink-0 mt-0.5"
            icon="chevL"
          >
            {t('scene.leave')}
          </Button>
          <div className="min-w-0">
            <p className={CAPTION_CLASS}>
              {formatScenePosition(currentIndex, setlistEntries.length)}
              {' · '}
              {setlistName}
            </p>
            <h2 className="font-display text-stage-title sm:text-stage-hero text-stage-ink m-0 mt-1 truncate">
              {headline.title ?? t('scene.unknownSong')}
            </h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-stage-ink-dim m-0 mt-1">
              {headline.artist === '' ? null : <span>{headline.artist}</span>}
              {headline.tonalityLabel === null ? null : (
                <span className="font-mono text-stage-ink">{headline.tonalityLabel}</span>
              )}
              {headline.capo === null ? null : (
                <span className="font-mono">{t('scene.capo', { fret: headline.capo })}</span>
              )}
              {headline.energy === null ? null : (
                <span className="inline-flex items-center gap-1">
                  <Icon name="bolt" size="sm" />
                  {headline.energy}
                </span>
              )}
            </p>
            <ChordChartSwitcher
              charts={chordProCharts}
              instruments={instruments}
              shownIndex={chartSwitch.shownIndex}
              onPick={chartSwitch.pick}
              tone="stage"
              className="mt-2"
            />
          </div>
        </div>
        <SceneControls
          semitones={semitones}
          fontSizePx={fontSizePx}
          scrollSpeedPxPerSecond={scrollSpeed}
          isAutoScrolling={isAutoScrolling}
          onTransposeBy={(delta) => setSemitones((current) => clampSemitoneOffset(current + delta))}
          onZoomBy={(delta) => setFontSizePx(clampSceneFontSize(fontSizePx + delta))}
          onScrollSpeedBy={changeScrollSpeed}
          onToggleAutoScroll={toggleAutoScroll}
        />
      </header>

      <div className="shrink-0 h-0.5 bg-stage-line">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${computeSceneProgressPercent(currentIndex, setlistEntries.length)}%` }}
        />
      </div>

      <div
        ref={attachSceneScrollBody}
        {...swipeHandlers}
        className="flex-1 overflow-y-auto px-4 sm:px-10 py-5"
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {setlistEntries.length === 0 ? (
          <p className="text-center font-display text-title text-stage-ink-dim py-20">
            {t('setlist.emptyList')}
          </p>
        ) : (
          <>
            {entry === undefined || entry.notes === '' ? null : (
              <p className="text-meta text-stage-ink-dim italic whitespace-pre-wrap mb-4">
                {entry.notes}
              </p>
            )}
            {song === undefined ? null : <SongNotes song={song} tone="dark" className="mb-5" />}
            {chordproText === null ? (
              <p className="text-center font-display text-title text-stage-ink-dim py-20">
                {t('scene.noChordpro')}
              </p>
            ) : (
              <ChordChartViewer source={chordproText} semitones={semitones} tone="dark" />
            )}
            {transitionPreview === null ? null : (
              <SceneTransitionPreview
                layout="card"
                cardRef={transitionCard.attachCard}
                {...transitionPreview}
              />
            )}
          </>
        )}
      </div>

      {transitionPreview === null || transitionCard.isCardInView ? null : (
        <SceneTransitionPreview
          layout="strip"
          onReveal={transitionCard.revealCard}
          {...transitionPreview}
        />
      )}

      {setlistEntries.length === 0 ? null : (
        <SceneTransport
          pills={pills}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < setlistEntries.length - 1}
          onPrevious={() => goToIndex(currentIndex - 1)}
          onNext={() => goToIndex(currentIndex + 1)}
          onSelect={goToIndex}
        />
      )}
    </dialog>
  );
}
