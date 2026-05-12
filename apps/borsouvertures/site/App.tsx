import { useEffect, useState } from 'react';
import { ErrorPanel } from '@/components/ErrorPanel';
import { LoadingPanel } from '@/components/LoadingPanel';
import { OpeningFlowSelector } from '@/components/OpeningFlowSelector';
import { SideSelector } from '@/components/SideSelector';
import { ToggleSlider } from '@/components/ToggleSlider';
import { TopBar } from '@/components/TopBar';
import { useIsMobile } from '@/hooks/useIsMobile';
import { loadOpenings } from '@/openings/loadOpenings';
import { ALL_KEY } from '@/openings/selectors.utils';
import type { Opening, Variation } from '@/openings/types';
import { ModeLearnTree } from '@/modes/ModeLearnTree';
import { ModePlay } from '@/modes/ModePlay';
import { type Mode, type TreeVisualizationMode, useAppState } from '@/state/useAppState';

export default function App() {
  const {
    mode,
    setMode,
    boardStyle,
    setBoardStyle,
    side,
    setSide,
    selection,
    setSelection,
    openings,
    setOpenings,
    view,
    setView,
    playAutoOpponent,
    setPlayAutoOpponent,
    playScope,
    setPlayScope,
    treeVisualizationMode,
    setTreeVisualizationMode,
  } = useAppState();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [showMoves, setShowMoves] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadOpenings()
      .then((result) => {
        if (result.ok) {
          setOpenings(result.openings);
          setLoadError(null);
        } else {
          setLoadError(result.error);
        }
      })
      .finally(() => setLoading(false));
  }, [setOpenings]);

  function handleReload(): void {
    window.location.reload();
  }

  function handleModeChange(nextMode: Mode): void {
    if (nextMode === 'play' && mode !== 'play') {
      // Reset Play scope when leaving Learn so Play doesn't lock to the last
      // line the user was learning.
      setPlayScope({ openingIds: [], variationIds: [], lineIds: [] });
      setSelection({ openingId: ALL_KEY, variationId: ALL_KEY, lineId: ALL_KEY });
    }
    setMode(nextMode);
  }

  const learnReady = mode === 'learn' && selection.variationId !== ALL_KEY;
  const playReady =
    mode === 'play' &&
    (selection.openingId !== ALL_KEY ||
      selection.variationId !== ALL_KEY ||
      selection.lineId !== ALL_KEY ||
      playScope.openingIds.length > 0 ||
      playScope.variationIds.length > 0 ||
      playScope.lineIds.length > 0);
  const sessionStartIsAllowed = learnReady || playReady;
  const sessionStartHint =
    mode === 'learn'
      ? 'Pick an opening + variation to drill its tree.'
      : 'Pick at least one opening, variation, or line to play.';
  const sessionStartLabel =
    mode === 'learn' ? 'Drill this variation' : 'Play within this scope';

  function handleSwitchToPlayWithVariation(opening: Opening, variation: Variation): void {
    setPlayScope({
      openingIds: [opening.id],
      variationIds: [variation.id],
      lineIds: [],
    });
    setSelection({ openingId: ALL_KEY, variationId: ALL_KEY, lineId: ALL_KEY });
    setMode('play');
  }

  // The toggle exposes 'arrows' / 'buttons' as a binary; persisted null means
  // "follow the device default" (mobile → buttons, desktop → arrows).
  const treeVisualizationDefault: 'arrows' | 'buttons' = isMobile ? 'buttons' : 'arrows';
  const effectiveTreeVisualization: 'arrows' | 'buttons' =
    treeVisualizationMode ?? treeVisualizationDefault;

  function handleTreeVisualizationToggle(useButtons: boolean): void {
    const next: TreeVisualizationMode = useButtons ? 'buttons' : 'arrows';
    setTreeVisualizationMode(next);
  }

  return (
    <div className="app-shell">
        <TopBar
          mode={mode}
          onModeChange={handleModeChange}
          boardStyle={boardStyle}
          onBoardStyleChange={setBoardStyle}
        />

        {loadError && (
          <ErrorPanel
            message="The opening dataset failed to load. Try reloading the page."
            onReload={handleReload}
          />
        )}

        {!loadError && view === 'select' && loading && <LoadingPanel />}

        {!loadError && view === 'select' && !loading && (
          <>
            <div className="panel">
              <SideSelector value={side} onChange={setSide} />
              {mode === 'play' && (
                <div className="controls-row" style={{ marginTop: '0.5rem' }}>
                  <ToggleSlider
                    value={playAutoOpponent}
                    onChange={setPlayAutoOpponent}
                    leftLabel="You play both"
                    rightLabel="Auto opponent"
                    ariaLabel="Auto opponent toggle"
                  />
                </div>
              )}
            </div>
            <OpeningFlowSelector
              openings={openings}
              selection={selection}
              onChange={setSelection}
              boardStyle={boardStyle}
              mode={mode}
              playScope={playScope}
              onPlayScopeChange={setPlayScope}
            />
            <div className="panel">
              <button
                type="button"
                className="btn active"
                onClick={() => setView('session')}
                disabled={!sessionStartIsAllowed}
              >
                {sessionStartLabel}
              </button>
              {!sessionStartIsAllowed && (
                <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>{sessionStartHint}</p>
              )}
            </div>
          </>
        )}

        {!loadError && view === 'session' && (
          <>
            <div className="controls-row" style={{ justifyContent: 'space-between' }}>
              <div className="controls-row">
                <button type="button" className="btn" onClick={() => setView('select')}>
                  Change selection
                </button>
                <ToggleSlider
                  value={showMoves}
                  onChange={setShowMoves}
                  leftLabel="Hide moves"
                  rightLabel="Show moves"
                  ariaLabel="Show moves toggle"
                />
                {mode === 'learn' && (
                  <ToggleSlider
                    value={effectiveTreeVisualization === 'buttons'}
                    onChange={handleTreeVisualizationToggle}
                    leftLabel="Arrows"
                    rightLabel="Buttons"
                    ariaLabel="Tree visualization mode"
                  />
                )}
                {mode === 'play' && (
                  <ToggleSlider
                    value={playAutoOpponent}
                    onChange={setPlayAutoOpponent}
                    leftLabel="You play both"
                    rightLabel="Auto opponent"
                    ariaLabel="Auto opponent toggle"
                  />
                )}
              </div>
            </div>
            {loading ? (
              <LoadingPanel />
            ) : mode === 'learn' ? (
              <ModeLearnTree
                openings={openings}
                selection={selection}
                side={side}
                boardStyle={boardStyle}
                treeVisualizationMode={treeVisualizationMode}
                onSwitchToPlayWithVariation={handleSwitchToPlayWithVariation}
              />
            ) : (
              <ModePlay
                openings={openings}
                selection={selection}
                side={side}
                boardStyle={boardStyle}
                autoOpponent={playAutoOpponent}
                showMoves={showMoves}
                playScope={playScope}
              />
            )}
          </>
        )}
    </div>
  );
}
