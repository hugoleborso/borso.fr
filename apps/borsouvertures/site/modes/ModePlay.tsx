import { useEffect, useMemo, useState } from 'react';
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types';
import { BoardView } from '@/components/BoardView';
import { Modal } from '@/components/Modal';
import { StatusPanel } from '@/components/StatusPanel';
import { useBoardSize } from '@/hooks/useBoardSize';
import { useChessGame } from '@/hooks/useChessGame';
import { computeBookState, type PlayScopeFilter } from '@/openings/bookEngine.utils';
import { ALL_KEY, type Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import { uciFromSquare, uciPromotion, uciToArrow, uciToSquare } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/useAppState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const AUTO_OPPONENT_DELAY_MS = 200;

interface ModePlayProps {
  openings: Opening[];
  selection: Selection;
  side: Side;
  boardStyle: BoardThemeId;
  autoOpponent: boolean;
  showMoves: boolean;
  playScope: PlayScopeFilter;
}

export function ModePlay({
  openings,
  selection,
  side,
  boardStyle,
  autoOpponent,
  showMoves,
  playScope,
}: ModePlayProps) {
  const { gameRef, fen, reset, syncFen } = useChessGame();
  const [playedMoves, setPlayedMoves] = useState<string[]>([]);
  const [showOutOfBook, setShowOutOfBook] = useState(false);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [highlightSquares, setHighlightSquares] = useState<CustomSquareStyles>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualArrows, setManualArrows] = useState(false);
  const boardWidth = useBoardSize();

  const bookState = useMemo(
    () => computeBookState(openings, selection, playedMoves, playScope),
    [openings, selection, playedMoves, playScope],
  );

  function resetGame(): void {
    reset();
    setPlayedMoves([]);
    setShowOutOfBook(false);
    setArrows([]);
    setHighlightSquares({});
    setShowSuccess(false);
    setManualArrows(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetGame is intentionally driven by selection / side changes only; including it would loop.
  useEffect(() => {
    resetGame();
  }, [selection.openingId, selection.variationId, selection.lineId, side]);

  useEffect(() => {
    if (showMoves && bookState.inBook) {
      setArrows(bookState.possibleNextMovesUci.map(uciToArrow));
      setManualArrows(false);
    } else if (!showMoves && !manualArrows) {
      setArrows([]);
    }
  }, [showMoves, bookState, manualArrows]);

  function pickRandomOpponentMove(possibleMovesUci: string[]): string | undefined {
    if (possibleMovesUci.length === 0) return undefined;
    const index = Math.floor(Math.random() * possibleMovesUci.length);
    return possibleMovesUci[index];
  }

  function handleMove(sourceSquare: string, targetSquare: string): boolean {
    setHighlightSquares({});
    setArrows([]);
    setManualArrows(false);
    setShowSuccess(false);
    const move = gameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    if (!move) return false;

    const moveStr = `${move.from}${move.to}${move.promotion ?? ''}`;
    const nextMoves = [...playedMoves, moveStr];
    const state = computeBookState(openings, selection, nextMoves, playScope);

    if (!state.inBook) {
      gameRef.current.undo();
      setShowOutOfBook(true);
      syncFen();
      return false;
    }

    setPlayedMoves(nextMoves);

    if (autoOpponent && state.inBook && state.possibleNextMovesUci.length > 0) {
      const ply = nextMoves.length;
      const isOpponentsTurn =
        (side === 'white' && ply % 2 === 1) || (side === 'black' && ply % 2 === 0);
      if (isOpponentsTurn) {
        const opponentMove = pickRandomOpponentMove(state.possibleNextMovesUci);
        if (!opponentMove) {
          syncFen();
          return true;
        }
        setTimeout(() => {
          gameRef.current.move({
            from: uciFromSquare(opponentMove),
            to: uciToSquare(opponentMove),
            promotion: uciPromotion(opponentMove),
          });
          const movesAfterOpponent = [...nextMoves, opponentMove];
          setPlayedMoves(movesAfterOpponent);
          syncFen();
          const stateAfterOpponent = computeBookState(
            openings,
            selection,
            movesAfterOpponent,
            playScope,
          );
          if (stateAfterOpponent.atLineEnd) {
            setHighlightSquares({});
            setArrows([]);
            setShowSuccess(true);
          }
        }, AUTO_OPPONENT_DELAY_MS);
        syncFen();
        return true;
      }
    }

    if (state.atLineEnd) {
      setShowOutOfBook(false);
      setHighlightSquares({});
      setArrows([]);
      syncFen();
      setShowSuccess(true);
      return true;
    }

    syncFen();
    return true;
  }

  function revealBookMoves(): void {
    const state = computeBookState(openings, selection, playedMoves, playScope);
    setArrows(state.possibleNextMovesUci.map(uciToArrow));
    setShowOutOfBook(false);
    setManualArrows(true);
  }

  function handleUndo(): void {
    const movesToUndo = autoOpponent ? 2 : 1;
    if (playedMoves.length < movesToUndo) return;

    for (let i = 0; i < movesToUndo; i++) gameRef.current.undo();

    const newPlayedMoves = playedMoves.slice(0, -movesToUndo);
    setPlayedMoves(newPlayedMoves);
    setHighlightSquares({});
    setShowOutOfBook(false);
    setShowSuccess(false);
    setManualArrows(false);

    if (showMoves) {
      const state = computeBookState(openings, selection, newPlayedMoves, playScope);
      setArrows(state.possibleNextMovesUci.map(uciToArrow));
    } else {
      setArrows([]);
    }

    syncFen();
  }

  const candidateCount = bookState.candidates.length;
  const missingScope =
    selection.lineId === ALL_KEY &&
    selection.variationId === ALL_KEY &&
    selection.openingId === ALL_KEY;

  return (
    <div className="play-grid">
      <div className="board-area">
        {missingScope && playScope.openingIds.length === 0 ? (
          <div className="panel">
            Pick at least one opening, variation, or line to start Play mode.
          </div>
        ) : (
          <BoardView
            orientation={side}
            fen={fen}
            onMove={handleMove}
            arrows={arrows}
            highlightSquares={highlightSquares}
            boardStyleId={boardStyle}
            boardWidth={boardWidth}
          />
        )}
      </div>
      <div className="play-aside">
        <div className="panel">
          <h3>Play within book</h3>
          <p>
            Stay in-book by matching any candidate line. Request book moves if you go out of book.
          </p>
          <div className="controls-row">
            <button type="button" className="btn" onClick={resetGame}>
              Reset game
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleUndo}
              disabled={playedMoves.length < (autoOpponent ? 2 : 1)}
            >
              Undo
            </button>
          </div>
        </div>
        <StatusPanel
          inBook={bookState.inBook}
          candidateCount={candidateCount}
          openingName={bookState.uniqueOpening?.name}
          variationName={bookState.uniqueVariation?.name}
          lineName={bookState.uniqueLine?.name}
        />
      </div>

      {showOutOfBook && (
        <Modal title="Out of Book" onClose={() => setShowOutOfBook(false)}>
          <div className="controls-row modal-actions between">
            <button type="button" className="btn" onClick={() => setShowOutOfBook(false)}>
              Try Again
            </button>
            <button type="button" className="btn active" onClick={revealBookMoves}>
              Show Book Moves
            </button>
          </div>
        </Modal>
      )}

      {showSuccess && (
        <Modal title="You reached the end of the line!" onClose={() => setShowSuccess(false)}>
          <div className="controls-row modal-actions">
            <button type="button" className="btn active" onClick={resetGame}>
              Play again
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
