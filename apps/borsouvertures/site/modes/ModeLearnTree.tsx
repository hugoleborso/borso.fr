import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types';
import { BoardView } from '@/components/BoardView';
import { InlineBanner } from '@/components/InlineBanner';
import { LoadingPanel } from '@/components/LoadingPanel';
import { Modal } from '@/components/Modal';
import { MoveButtonList } from '@/components/MoveButtonList';
import { useBoardSize } from '@/hooks/useBoardSize';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  createLearnTreeMachine,
  type LearnTreeMachine,
} from '@/openings/learnTreeMachine.utils';
import { ALL_KEY, findOpening, findVariation, type Selection } from '@/openings/selectors.utils';
import type { Opening, Variation } from '@/openings/types';
import { uciToArrow } from '@/openings/uciSquare.utils';
import type { Side, TreeVisualizationMode } from '@/state/useAppState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface ModeLearnTreeProps {
  openings: Opening[];
  selection: Selection;
  side: Side;
  boardStyle: BoardThemeId;
  treeVisualizationMode: TreeVisualizationMode;
  onSwitchToPlayWithVariation: (variation: Variation) => void;
}

export function ModeLearnTree({
  openings,
  selection,
  side,
  boardStyle,
  treeVisualizationMode,
  onSwitchToPlayWithVariation,
}: ModeLearnTreeProps) {
  const machineRef = useRef<LearnTreeMachine | null>(null);
  if (machineRef.current === null) {
    machineRef.current = createLearnTreeMachine();
  }
  const machine = machineRef.current;
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot);
  const boardWidth = useBoardSize();
  const isMobile = useIsMobile();

  const variation = useMemo(() => {
    const opening = findOpening(openings, selection.openingId);
    return findVariation(opening, selection.variationId);
  }, [openings, selection]);

  // Sync the machine with React props. The machine is the external system here
  // (it owns chess.js + setTimeout); useEffect is the right escape hatch.
  useEffect(() => {
    if (!variation) return;
    machine.start(variation, side);
  }, [machine, variation, side]);

  if (!variation || selection.variationId === ALL_KEY) {
    return <LoadingPanel message="Pick an opening + variation to drill its tree." />;
  }

  const showButtons =
    treeVisualizationMode === 'buttons' ||
    (treeVisualizationMode === null && isMobile);

  const arrows: Arrow[] =
    !showButtons && snapshot.showRevealedArrows
      ? snapshot.nextBookMovesUci.map((uci) => uciToArrow(uci))
      : [];
  const highlightSquares: CustomSquareStyles = {};

  function handleMove(sourceSquare: string, targetSquare: string): boolean {
    const uci = `${sourceSquare}${targetSquare}`;
    return machine.playMove(uci) === 'accepted';
  }

  return (
    <div className="layout">
      <div className="board-area">
        <BoardView
          orientation={side}
          fen={snapshot.fen}
          onMove={handleMove}
          arrows={arrows}
          highlightSquares={highlightSquares}
          boardStyleId={boardStyle}
          boardWidth={boardWidth}
        />
        {snapshot.variationCleared && (
          <InlineBanner
            message="Variation cleared — every line visited at least once"
            primaryLabel="Switch to Play with this scope"
            onPrimaryClick={() => onSwitchToPlayWithVariation(variation)}
            secondaryLabel="Drill again"
            onSecondaryClick={machine.reset}
          />
        )}
      </div>
      <div className="play-aside">
        <div className="panel">
          <h3>Drill: {variation.name}</h3>
          <p>
            Play any book move. The opponent picks one of the book replies at random; the drill
            ends when every line in this variation has been visited at least once.
          </p>
          <div className="controls-row">
            <button type="button" className="btn" onClick={machine.reset}>
              Reset drill
            </button>
            {snapshot.showRevealedArrows ? (
              <button type="button" className="btn" onClick={machine.hideArrows}>
                Hide arrows
              </button>
            ) : (
              <button type="button" className="btn" onClick={machine.revealArrows}>
                Reveal arrows
              </button>
            )}
          </div>
        </div>
        {showButtons && (
          <MoveButtonList
            candidates={snapshot.nextBookMovesUci}
            fen={snapshot.fen}
            onPick={(uci) => machine.playMove(uci)}
          />
        )}
        <div className="panel status-grid">
          <div className="status-item">
            <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>Lines visited</div>
            <div>
              {snapshot.visitedLeafIds.size} / {variation.lines.length}
            </div>
          </div>
        </div>
      </div>
      {snapshot.outOfBookOpen && (
        <Modal title="Out of book" onClose={machine.dismissOutOfBook}>
          <p>That move isn't in this variation. Try one of the book moves shown.</p>
          <div className="controls-row modal-actions">
            <button type="button" className="btn" onClick={machine.dismissOutOfBook}>
              Try again
            </button>
            <button
              type="button"
              className="btn active"
              onClick={() => {
                machine.revealArrows();
                machine.dismissOutOfBook();
              }}
            >
              Reveal book moves
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
