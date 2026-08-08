import { type CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Arrow } from 'react-chessboard';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import type { Side } from '@/state/persistedState.utils';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import {
  type BoardDropDecision,
  buildDroppedUci,
  selectBoardDropDecision,
} from './boardDrop.utils';
import { buildNamedPieces } from './boardPieces';

const BOARD_BORDER_RADIUS = '12px';
const BOARD_SHADOW = '0 10px 30px rgba(0,0,0,0.4)';
const MOVE_ANIMATION_MS = 200;

type IsMoveAccepted = (uci: string) => boolean;

const DROP_OUTCOME_BY_DECISION: Record<
  BoardDropDecision,
  (isMoveAccepted: IsMoveAccepted, uci: string) => boolean
> = {
  ignored: () => false,
  played: (isMoveAccepted, uci) => isMoveAccepted(uci),
};

interface BoardViewProps {
  orientation: Side;
  fen: string;
  onMove: IsMoveAccepted;
  arrows: Arrow[];
  highlightSquares: Record<string, CSSProperties>;
  boardStyleId: BoardThemeId;
  boardWidth: number;
}

export function BoardView({
  orientation,
  fen,
  onMove,
  arrows,
  highlightSquares,
  boardStyleId,
  boardWidth,
}: BoardViewProps) {
  const { t } = useTranslation();
  const { theme } = getBoardAppearance(boardStyleId);
  const namedPieces = useMemo(() => buildNamedPieces(t), [t]);
  return (
    <div className="panel board-container" style={{ width: `${boardWidth}px` }}>
      <Chessboard
        options={{
          id: 'bors-board',
          position: fen,
          pieces: namedPieces,
          boardOrientation: orientation,
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareStyle: { backgroundColor: theme.light },
          boardStyle: { borderRadius: BOARD_BORDER_RADIUS, boxShadow: BOARD_SHADOW },
          arrowOptions: { ...defaultArrowOptions, color: theme.arrow },
          arrows,
          squareStyles: highlightSquares,
          animationDurationInMs: MOVE_ANIMATION_MS,
          allowDragging: true,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            DROP_OUTCOME_BY_DECISION[selectBoardDropDecision(targetSquare)](
              onMove,
              buildDroppedUci(sourceSquare, targetSquare),
            ),
        }}
      />
    </div>
  );
}
