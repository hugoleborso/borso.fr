import { useEffect, useState } from 'react';
import { ChessboardDnDProvider } from 'react-chessboard';
import { LoadingPanel } from '@/components/LoadingPanel';
import { OpeningFlowSelector } from '@/components/OpeningFlowSelector';
import { SideSelector } from '@/components/SideSelector';
import { ToggleSlider } from '@/components/ToggleSlider';
import { TopBar } from '@/components/TopBar';
import { loadOpenings } from '@/openings/loadOpenings';
import { ALL_KEY } from '@/openings/selectors.utils';
import { ModeLearn } from '@/modes/ModeLearn';
import { ModePlay } from '@/modes/ModePlay';
import { type Mode, useAppState } from '@/state/useAppState';

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
  } = useAppState();
  const [loading, setLoading] = useState(true);
  const [showMoves, setShowMoves] = useState(false);

  useEffect(() => {
    loadOpenings()
      .then(setOpenings)
      .finally(() => setLoading(false));
  }, [setOpenings]);

  function handleModeChange(nextMode: Mode): void {
    if (nextMode === 'play' && mode !== 'play') {
      // Reset Play scope when leaving Learn so Play doesn't lock to the last
      // line the user was learning.
      setPlayScope({ openingIds: [], variationIds: [], lineIds: [] });
      setSelection({ openingId: ALL_KEY, variationId: ALL_KEY, lineId: ALL_KEY });
    }
    setMode(nextMode);
  }

  return (
    <ChessboardDnDProvider>
      <div className="app-shell">
        <TopBar
          mode={mode}
          onModeChange={handleModeChange}
          boardStyle={boardStyle}
          onBoardStyleChange={setBoardStyle}
        />

        {view === 'select' && loading && <LoadingPanel />}

        {view === 'select' && !loading && (
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
              <button type="button" className="btn active" onClick={() => setView('session')}>
                Start session
              </button>
            </div>
          </>
        )}

        {view === 'session' && (
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
              <ModeLearn
                openings={openings}
                selection={selection}
                side={side}
                boardStyle={boardStyle}
                showMoves={showMoves}
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
    </ChessboardDnDProvider>
  );
}
