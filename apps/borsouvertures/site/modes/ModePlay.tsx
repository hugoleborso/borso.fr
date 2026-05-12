import { type CSSProperties, useEffect, useRef, useSyncExternalStore } from 'react';
import type { Arrow } from 'react-chessboard';
import { BoardView } from '@/components/BoardView';
import { InlineBanner } from '@/components/InlineBanner';
import { Modal } from '@/components/Modal';
import { StatusPanel } from '@/components/StatusPanel';
import { useBoardSize } from '@/hooks/useBoardSize';
import type { PlayScopeFilter } from '@/openings/bookEngine.utils';
import { shortLineName } from '@/openings/lineDisplay.utils';
import { createPlayMachine, type PlayMachine } from '@/openings/playMachine.utils';
import type { Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import { uciToArrow } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/useAppState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface ModePlayProps {
  openings: Opening[];
  selection: Selection;
  side: Side;
  boardStyle: BoardThemeId;
  autoOpponent: boolean;
  showMoves: boolean;
  playScope: PlayScopeFilter;
}

const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};

export function ModePlay({
  openings,
  selection,
  side,
  boardStyle,
  autoOpponent,
  showMoves,
  playScope,
}: ModePlayProps) {
  const machineRef = useRef<PlayMachine | null>(null);
  if (machineRef.current === null) {
    machineRef.current = createPlayMachine();
  }
  const machine = machineRef.current;
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot);
  const boardWidth = useBoardSize();

  // The machine is the external system here (chess.js + setTimeout); useEffect
  // is the right escape hatch for syncing React props onto it. start() resets
  // the played-move history, so we only call it when the scope or side
  // genuinely changes — autoOpponent is propagated by the second effect below
  // so toggling it doesn't reset the drill.
  // biome-ignore lint/correctness/useExhaustiveDependencies: autoOpponent is intentionally excluded; setAutoOpponent below mirrors changes without resetting.
  useEffect(() => {
    machine.start({ openings, selection, playScope, side, autoOpponent });
  }, [machine, openings, selection, playScope, side]);

  useEffect(() => {
    machine.setAutoOpponent(autoOpponent);
  }, [machine, autoOpponent]);

  const arrows: Arrow[] =
    snapshot.inBook && (showMoves || snapshot.manualReveal)
      ? snapshot.nextBookMovesUci.map((uci) => uciToArrow(uci))
      : [];

  function handleMove(sourceSquare: string, targetSquare: string): boolean {
    return machine.playMove(`${sourceSquare}${targetSquare}`) === 'accepted';
  }

  const completedLineLabel =
    snapshot.uniqueOpening && snapshot.uniqueVariation && snapshot.uniqueLine
      ? (shortLineName(
          snapshot.uniqueOpening,
          snapshot.uniqueVariation,
          snapshot.uniqueLine,
        ) ?? snapshot.uniqueVariation.name)
      : null;
  const celebrationMessage = completedLineLabel
    ? `Line completed — ${completedLineLabel}!`
    : 'Line completed!';

  return (
    <div className="play-grid">
      <div className="board-area">
        {snapshot.successOpen && (
          <InlineBanner
            celebrate
            message={celebrationMessage}
            primaryLabel="Play again"
            onPrimaryClick={machine.reset}
            secondaryLabel="Dismiss"
            onSecondaryClick={machine.dismissSuccess}
          />
        )}
        <BoardView
          orientation={side}
          fen={snapshot.fen}
          onMove={handleMove}
          arrows={arrows}
          highlightSquares={NO_HIGHLIGHTS}
          boardStyleId={boardStyle}
          boardWidth={boardWidth}
        />
      </div>
      <div className="play-aside">
        <div className="panel">
          <h3>Play within book</h3>
          <p>
            Stay in-book by matching any candidate line. Request book moves if you go out of
            book.
          </p>
          <div className="controls-row">
            <button type="button" className="btn" onClick={machine.reset}>
              Reset game
            </button>
            <button
              type="button"
              className="btn"
              onClick={machine.undo}
              disabled={snapshot.playedMovesUci.length < (autoOpponent ? 2 : 1)}
            >
              Undo
            </button>
          </div>
        </div>
        <StatusPanel
          inBook={snapshot.inBook}
          candidateCount={snapshot.candidateCount}
          openingName={snapshot.uniqueOpening?.name}
          variationName={snapshot.uniqueVariation?.name}
          lineName={
            snapshot.uniqueOpening && snapshot.uniqueVariation && snapshot.uniqueLine
              ? (shortLineName(
                  snapshot.uniqueOpening,
                  snapshot.uniqueVariation,
                  snapshot.uniqueLine,
                ) ?? undefined)
              : undefined
          }
        />
      </div>

      {snapshot.outOfBookOpen && (
        <Modal title="Out of Book" onClose={machine.dismissOutOfBook}>
          <div className="controls-row modal-actions between">
            <button type="button" className="btn" onClick={machine.dismissOutOfBook}>
              Try Again
            </button>
            <button type="button" className="btn active" onClick={machine.revealBookMoves}>
              Show Book Moves
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
