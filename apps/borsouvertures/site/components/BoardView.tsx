import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import type { Arrow } from 'react-chessboard';
import type { CSSProperties } from 'react';
import type { Side } from '@/state/useAppState';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface BoardViewProps {
  orientation: Side;
  fen: string;
  onMove: (sourceSquare: string, targetSquare: string) => boolean;
  arrows?: Arrow[];
  highlightSquares?: Record<string, CSSProperties>;
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
  const { theme } = getBoardAppearance(boardStyleId);
  const wrapperStyle: CSSProperties =
    boardWidth !== undefined ? { width: `${boardWidth}px` } : { width: '100%' };
  return (
    <div className="panel board-container" style={wrapperStyle}>
      <Chessboard
        options={{
          id: 'bors-board',
          position: fen,
          boardOrientation: orientation,
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareStyle: { backgroundColor: theme.light },
          boardStyle: { borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' },
          arrowOptions: { ...defaultArrowOptions, color: theme.arrow },
          arrows,
          squareStyles: highlightSquares,
          animationDurationInMs: 200,
          allowDragging: true,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (targetSquare === null) return false;
            return onMove(sourceSquare, targetSquare);
          },
        }}
      />
    </div>
  );
}
