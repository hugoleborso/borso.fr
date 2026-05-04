import { Chessboard } from 'react-chessboard';
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import type { Side } from '@/state/useAppState';

interface BoardViewProps {
  orientation: Side;
  fen: string;
  onMove: (sourceSquare: string, targetSquare: string) => boolean;
  arrows?: Arrow[];
  highlightSquares?: CustomSquareStyles;
  boardStyleId: BoardThemeId;
  boardWidth?: number;
}

export function BoardView({
  orientation,
  fen,
  onMove,
  arrows = [],
  highlightSquares = {},
  boardStyleId,
  boardWidth,
}: BoardViewProps) {
  const { theme, customPieces } = getBoardAppearance(boardStyleId);
  return (
    <div className="panel board-container" style={{ width: '100%' }}>
      <Chessboard
        id="bors-board"
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={(sourceSquare, targetSquare) => onMove(sourceSquare, targetSquare)}
        customDarkSquareStyle={{ backgroundColor: theme.dark }}
        customLightSquareStyle={{ backgroundColor: theme.light }}
        customBoardStyle={{ borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
        customArrowColor={theme.arrow}
        customArrows={arrows}
        customSquareStyles={highlightSquares}
        customPieces={customPieces}
        animationDuration={200}
        arePiecesDraggable
        boardWidth={boardWidth}
      />
    </div>
  );
}
