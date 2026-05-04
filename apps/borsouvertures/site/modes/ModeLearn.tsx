import { useEffect, useMemo, useState } from 'react';
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types';
import { BoardView } from '@/components/BoardView';
import { Modal } from '@/components/Modal';
import { useBoardSize } from '@/hooks/useBoardSize';
import { useChessGame } from '@/hooks/useChessGame';
import {
  ALL_KEY,
  findLine,
  findOpening,
  findVariation,
  type Selection,
} from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import { toSquare, uciFromSquare, uciPromotion, uciToSquare } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/useAppState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const OPPONENT_MOVE_DELAY_MS = 250;
const INCORRECT_HIGHLIGHT_COLOR = 'rgba(255,0,0,0.35)';

interface ModeLearnProps {
  openings: Opening[];
  selection: Selection;
  side: Side;
  boardStyle: BoardThemeId;
  showMoves: boolean;
}

export function ModeLearn({ openings, selection, side, boardStyle, showMoves }: ModeLearnProps) {
  const { gameRef, fen, reset, syncFen } = useChessGame();
  const [incorrectArrow, setIncorrectArrow] = useState<Arrow | null>(null);
  const [correctArrow, setCorrectArrow] = useState<Arrow | null>(null);
  const [showIncorrect, setShowIncorrect] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const boardWidth = useBoardSize();

  const selectedLine = useMemo(() => {
    const opening = findOpening(openings, selection.openingId);
    const variation = findVariation(opening, selection.variationId);
    return findLine(variation, selection.lineId);
  }, [openings, selection]);

  function applyUci(uci: string): void {
    gameRef.current.move({
      from: uciFromSquare(uci),
      to: uciToSquare(uci),
      promotion: uciPromotion(uci),
    });
  }

  function syncToPlayerTurn(): void {
    if (!selectedLine) {
      syncFen();
      return;
    }
    const playNextOpponentMove = () => {
      const ply = gameRef.current.history().length;
      if (ply >= selectedLine.movesUci.length) return;
      const isPlayersTurn =
        (side === 'white' && ply % 2 === 0) || (side === 'black' && ply % 2 === 1);
      if (isPlayersTurn) return;
      setTimeout(() => {
        const uci = selectedLine.movesUci[ply];
        if (!uci) return;
        applyUci(uci);
        syncFen();
        playNextOpponentMove();
      }, OPPONENT_MOVE_DELAY_MS);
    };
    playNextOpponentMove();
  }

  function resetBoard(): void {
    reset();
    setIncorrectArrow(null);
    setCorrectArrow(null);
    setShowIncorrect(false);
    setShowSuccess(false);
    syncToPlayerTurn();
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetBoard reads the latest selectedLine + side via closure and is intentionally re-run only on those changes.
  useEffect(() => {
    resetBoard();
  }, [selectedLine, side]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: derived from showMoves + line, not from the mutable gameRef history pointer.
  useEffect(() => {
    if (!selectedLine) return;
    if (!showMoves) {
      setCorrectArrow(null);
      return;
    }
    const currentPly = gameRef.current.history().length;
    const expectedMove = selectedLine.movesUci[currentPly];
    if (expectedMove) {
      setCorrectArrow([uciFromSquare(expectedMove), uciToSquare(expectedMove)]);
    }
  }, [showMoves, selectedLine]);

  const highlightSquares: CustomSquareStyles =
    incorrectArrow && showIncorrect
      ? {
          [incorrectArrow[0]]: { backgroundColor: INCORRECT_HIGHLIGHT_COLOR },
          [incorrectArrow[1]]: { backgroundColor: INCORRECT_HIGHLIGHT_COLOR },
        }
      : {};

  function handleMove(sourceSquare: string, targetSquare: string): boolean {
    if (!selectedLine) return false;
    const currentPly = gameRef.current.history().length;
    const expectedMove = selectedLine.movesUci[currentPly];
    if (!expectedMove) return false;
    const attemptedUci = `${sourceSquare}${targetSquare}`;
    const promotionSuffix = expectedMove.length === 5 ? expectedMove[4] : '';
    const attemptedFull = attemptedUci + promotionSuffix;

    if (attemptedFull !== expectedMove) {
      setIncorrectArrow([toSquare(sourceSquare), toSquare(targetSquare)]);
      setShowIncorrect(true);
      return false;
    }

    applyUci(expectedMove);
    setIncorrectArrow(null);
    setShowIncorrect(false);
    setCorrectArrow(null);

    if (gameRef.current.history().length >= selectedLine.movesUci.length) {
      syncFen();
      setShowSuccess(true);
      return true;
    }

    syncFen();
    syncToPlayerTurn();
    return true;
  }

  const missingLine = !selectedLine || selection.lineId === ALL_KEY;
  const arrowsToShow: Arrow[] = correctArrow ? [correctArrow] : [];

  return (
    <div className="layout">
      <div>
        {missingLine ? (
          <div className="panel">Select a specific line to start Learn mode.</div>
        ) : (
          <BoardView
            orientation={side}
            fen={fen}
            onMove={handleMove}
            arrows={arrowsToShow}
            highlightSquares={highlightSquares}
            boardStyleId={boardStyle}
            boardWidth={boardWidth}
          />
        )}
      </div>
      <div className="panel">
        <h3>Instructions</h3>
        <p>
          Play the next book move. Incorrect moves will be reverted; you can reveal the correct
          move.
        </p>
        <button type="button" className="btn" onClick={resetBoard}>
          Reset line
        </button>
      </div>

      {showIncorrect && (
        <Modal title="Incorrect Move" onClose={() => setShowIncorrect(false)}>
          <div className="controls-row modal-actions">
            <button type="button" className="btn" onClick={() => setShowIncorrect(false)}>
              Try Again
            </button>
            <button
              type="button"
              className="btn active"
              onClick={() => {
                if (selectedLine) {
                  const expectedMove = selectedLine.movesUci[gameRef.current.history().length];
                  if (expectedMove) {
                    setCorrectArrow([uciFromSquare(expectedMove), uciToSquare(expectedMove)]);
                  }
                }
                setShowIncorrect(false);
              }}
            >
              Show Correct Move
            </button>
          </div>
        </Modal>
      )}

      {showSuccess && (
        <Modal title="Line completed successfully!" onClose={() => setShowSuccess(false)}>
          <div className="controls-row modal-actions">
            <button type="button" className="btn active" onClick={resetBoard}>
              Replay line
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
