/** @Feature setlists */

import type { JSX, KeyboardEvent } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SongNotes } from '../../components/molecules/SongNotes';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { SceneControls } from '../../components/organisms/SceneControls';
import { SceneTransport } from '../../components/organisms/SceneTransport';
import { openSceneOnAttach } from '../../lib/scene-dialog.adapter';
import {
  attachSceneScrollBody,
  scrollSceneBodyToTop,
  startSceneAutoScroll,
  stopSceneAutoScroll,
} from '../../lib/scene-scroll.adapter';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { selectChordProText } from '../catalog/chart-kind.utils';
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

const NO_ROWS: readonly never[] = [];
const CAPTION_CLASS = 'font-mono text-[11px] tracking-[0.18em] uppercase text-stage-ink-dim m-0';

export function SetlistScenePage(): JSX.Element {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { t } = useTranslation();
  if (setlistId === undefined) {
    return <p className="px-4 sm:px-9 py-7 text-danger">{t('setlist.missingId')}</p>;
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
    scrollSceneBodyToTop();
  };

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
    return <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  if (setlist === null) {
    return (
      <NotFoundNotice
        message={t('setlist.notFound')}
        backTo="/setlists"
        backLabel={t('setlist.title')}
      />
    );
  }

  const entry = setlistEntries[currentIndex];
  const song = entry === undefined ? undefined : songsById[entry.songId];
  const headline = buildSceneHeadline(entry, song);
  const chordproText = selectChordProText(song?.chart);
  const setlistName = selectSetlistDisplayName(setlist.name, t('setlist.untitled'));

  return (
    <dialog
      ref={openSceneOnAttach}
      onClose={leaveScene}
      onKeyDown={readKey}
      aria-label={t('scene.title')}
      className="fixed inset-0 z-50 m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-stage-bg text-stage-ink overflow-hidden p-0 flex flex-col"
    >
      <header className="shrink-0 flex flex-col gap-3 px-4 sm:px-8 pt-4 pb-3 border-b border-[rgba(255,255,255,0.08)] lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button variant="stage" size="sm" onClick={leaveScene} className="shrink-0 mt-0.5">
            <Icon name="chevL" size={14} />
            {t('scene.leave')}
          </Button>
          <div className="min-w-0">
            <p className={CAPTION_CLASS}>
              {formatScenePosition(currentIndex, setlistEntries.length)}
              {' · '}
              {setlistName}
            </p>
            <h2 className="font-display italic text-2xl sm:text-4xl text-stage-ink m-0 mt-1 truncate">
              {headline.title ?? t('scene.unknownSong')}
            </h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stage-ink-dim m-0 mt-1">
              {headline.artist === '' ? null : <span>{headline.artist}</span>}
              {headline.tonalityLabel === null ? null : (
                <span className="font-mono text-stage-ink">{headline.tonalityLabel}</span>
              )}
              {headline.capo === null ? null : (
                <span className="font-mono">{t('scene.capo', { fret: headline.capo })}</span>
              )}
              {headline.energy === null ? null : (
                <span className="inline-flex items-center gap-1">
                  <Icon name="bolt" size={12} />
                  {headline.energy}
                </span>
              )}
            </p>
          </div>
        </div>
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
      </header>

      <div className="shrink-0 h-0.5 bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${computeSceneProgressPercent(currentIndex, setlistEntries.length)}%` }}
        />
      </div>

      <div
        ref={attachSceneScrollBody}
        className="flex-1 overflow-y-auto px-4 sm:px-10 py-5"
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {setlistEntries.length === 0 ? (
          <p className="text-center font-display italic text-2xl text-stage-ink-dim py-20">
            {t('setlist.emptyList')}
          </p>
        ) : (
          <>
            {entry === undefined || entry.notes === '' ? null : (
              <p className="text-sm text-stage-ink-dim italic whitespace-pre-wrap mb-4">
                {entry.notes}
              </p>
            )}
            {song === undefined ? null : <SongNotes song={song} tone="dark" className="mb-5" />}
            {chordproText === null ? (
              <p className="text-center font-display italic text-2xl text-stage-ink-dim py-20">
                {t('scene.noChordpro')}
              </p>
            ) : (
              <ChordChartViewer source={chordproText} semitones={semitones} tone="dark" />
            )}
          </>
        )}
      </div>

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
