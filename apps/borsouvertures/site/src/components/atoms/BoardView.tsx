import { type CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Arrow } from 'react-chessboard';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import type { Side } from '@/state/persistedState.utils';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import { type BoardMark, type BoardMarkTone, placeBoardMark } from './board-mark.utils';
import {
  type BoardDropDecision,
  buildDroppedUci,
  selectBoardDropDecision,
} from './boardDrop.utils';
import { buildNamedPieces } from './boardPieces';

const BOARD_BORDER_RADIUS = '0';
const MOVE_ANIMATION_MS = 200;

type IsMoveAccepted = (uci: string) => boolean;

// @FollowsBlueprint component-lookup-table
const DROP_OUTCOME_BY_DECISION: Record<
  BoardDropDecision,
  (isMoveAccepted: IsMoveAccepted, uci: string) => boolean
> = {
  ignored: () => false,
  played: (isMoveAccepted, uci) => isMoveAccepted(uci),
};

const MARK_CLASS =
  'pointer-events-none absolute z-10 rounded-full outline-2 outline-page ' +
  'motion-safe:animate-board-mark-in';

// @FollowsBlueprint component-lookup-table
const MARK_LOOK_BY_TONE = {
  recalled: {
    discClass: `${MARK_CLASS} bg-recalled text-on-recalled`,
    glyphPath: 'M5.5 12.5l4.5 4.5 8.5-9.5',
    labelKey: 'board.mark.recalled',
  },
  missed: {
    discClass: `${MARK_CLASS} bg-missed text-on-missed`,
    glyphPath: 'M7 7l10 10M17 7L7 17',
    labelKey: 'board.mark.missed',
  },
} as const satisfies Record<
  BoardMarkTone,
  { discClass: string; glyphPath: string; labelKey: string }
>;

interface BoardViewProps {
  orientation: Side;
  fen: string;
  onMove: IsMoveAccepted;
  arrows: Arrow[];
  highlightSquares: Record<string, CSSProperties>;
  boardStyleId: BoardThemeId;
  boardWidth: number;
  mark: BoardMark | null;
}

// @FollowsBlueprint atom-plain
export function BoardView({
  orientation,
  fen,
  onMove,
  arrows,
  highlightSquares,
  boardStyleId,
  boardWidth,
  mark,
}: BoardViewProps) {
  const { t } = useTranslation();
  const { theme } = getBoardAppearance(boardStyleId);
  const namedPieces = useMemo(() => buildNamedPieces(t), [t]);
  const markBox = placeBoardMark(mark?.square ?? null, orientation);
  return (
    <div
      className="relative flex justify-center self-center shrink-0 -mx-4 roomy:mx-0"
      style={{ width: `${boardWidth}px` }}
    >
      <Chessboard
        options={{
          id: 'bors-board',
          position: fen,
          pieces: namedPieces,
          boardOrientation: orientation,
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareStyle: { backgroundColor: theme.light },
          boardStyle: { borderRadius: BOARD_BORDER_RADIUS },
          arrowOptions: {
            ...defaultArrowOptions,
            colors: { ...defaultArrowOptions.colors, default: theme.arrow },
          },
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
      {mark === null ? null : (
        <svg
          role="img"
          aria-label={t(MARK_LOOK_BY_TONE[mark.tone].labelKey)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          className={MARK_LOOK_BY_TONE[mark.tone].discClass}
          style={{
            left: `${markBox.leftPercent}%`,
            top: `${markBox.topPercent}%`,
            width: `${markBox.sizePercent}%`,
          }}
        >
          <path d={MARK_LOOK_BY_TONE[mark.tone].glyphPath} />
        </svg>
      )}
    </div>
  );
}
