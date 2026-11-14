import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Arrow } from 'react-chessboard';
import { Chessboard, defaultArrowOptions, defaultPieces } from 'react-chessboard';
import { playMoveSound } from '@/lib/move-sound.setup';
import { EVALUATION_BAR_WIDTH_PX } from '@/lib/viewport.utils';
import type { EvaluationBarView } from '@/opponent/stockfish-evaluation.core';
import type { Side } from '@/state/persistedState.utils';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import {
  type BoardMover,
  isPieceMovable,
  type MovableSide,
  selectMovableSide,
} from './board-gesture.utils';
import {
  type BoardPointerStep,
  buildBoardPointerState,
  type FenTrail,
  followFen,
  listPromotionChoices,
  listSelectedTargets,
  selectCurrentPointerState,
  selectDragStartState,
  selectDropStep,
  selectPromotionStep,
  selectRightPressState,
  selectRightReleaseState,
  selectTapStep,
} from './board-interaction.utils';
import { type BoardMark, type BoardMarkTone, placeBoardMark } from './board-mark.utils';
import { findPlayedSquares, listCheckedKingSquares } from './board-moves.utils';
import { buildBoardSquareStyles } from './board-square-styles.utils';
import { buildNamedPieces } from './boardPieces';
import { EvaluationBar } from './EvaluationBar';

const BOARD_BORDER_RADIUS = '0';
const MOVE_ANIMATION_MS = 200;
const DROP_SQUARE_STYLE: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(255, 255, 255, 0.8)' };
const DRAGGING_PIECE_STYLE: CSSProperties = { transform: 'var(--board-drag-lift)' };
const NOTATION_STYLE: CSSProperties = { fontSize: '0.6875rem', fontWeight: 700 };
const SECONDARY_MOUSE_BUTTON = 2;

type IsMoveAccepted = (uci: string) => boolean;

const BOARD_CLASS =
  'relative flex justify-center self-center shrink-0 -mx-4 select-none ' +
  '[-webkit-touch-callout:none] roomy:mx-0 [--board-drag-lift:scale(1.15)] ' +
  'pointer-coarse:[--board-drag-lift:translateY(-45%)_scale(1.6)]';

// @FollowsBlueprint component-lookup-table
const STILL_PIECES_CLASS_BY_MOVABLE_SIDE = {
  white: `${BOARD_CLASS} [&_[data-piece^=b]]:touch-manipulation!`,
  black: `${BOARD_CLASS} [&_[data-piece^=w]]:touch-manipulation!`,
  none: `${BOARD_CLASS} [&_[data-piece]]:touch-manipulation!`,
} as const satisfies Record<MovableSide, string>;

const MARK_CLASS =
  'pointer-events-none absolute z-10 rounded-full outline-2 outline-page ' +
  'motion-safe:animate-board-mark-in';

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

const PROMOTION_CHOICE_CLASS =
  'absolute z-10 flex items-center justify-center bg-page outline-1 outline-rule';

interface BoardViewProps {
  orientation: Side;
  fen: string;
  onMove: IsMoveAccepted;
  mover: BoardMover;
  arrows: Arrow[];
  highlightSquares: Record<string, CSSProperties>;
  boardStyleId: BoardThemeId;
  boardWidth: number;
  mark: BoardMark | null;
  evaluationBar: EvaluationBarView | null;
  isMoveSoundOn: boolean;
}

// @FollowsBlueprint atom-plain
export function BoardView({
  orientation,
  fen,
  onMove,
  mover,
  arrows,
  highlightSquares,
  boardStyleId,
  boardWidth,
  mark,
  evaluationBar,
  isMoveSoundOn,
}: BoardViewProps) {
  const { t } = useTranslation();
  const { theme } = getBoardAppearance(boardStyleId);
  const namedPieces = useMemo(() => buildNamedPieces(t), [t]);
  const [fenTrail, setFenTrail] = useState<FenTrail>({ previousFen: null, fen });
  const currentTrail = followFen(fenTrail, fen);
  const isNewPosition = currentTrail !== fenTrail;
  if (isNewPosition) setFenTrail(currentTrail);
  const [storedPointer, setPointer] = useState(() => buildBoardPointerState(fen));
  const pointer = selectCurrentPointerState(storedPointer, fen);
  const movableSide = selectMovableSide(fen, mover);
  const playedSquares = useMemo(
    () => findPlayedSquares(currentTrail.previousFen, fen),
    [currentTrail.previousFen, fen],
  );
  const checkedKingSquares = useMemo(() => listCheckedKingSquares(fen), [fen]);
  const targets = useMemo(() => listSelectedTargets(pointer), [pointer]);
  const squareStyles = buildBoardSquareStyles({
    givenStyles: highlightSquares,
    playedSquares,
    selectedSquare: pointer.selectedSquare,
    targets,
    checkedKingSquares,
    markedSquares: pointer.markedSquares,
    highlightColour: theme.highlight,
  });
  const promotionChoices = listPromotionChoices(pointer.pendingPromotion, orientation);
  const isPromotionAsked = promotionChoices.length > 0;
  const markBox = placeBoardMark(mark?.square ?? null, orientation);
  const barWidth = evaluationBar === null ? 0 : EVALUATION_BAR_WIDTH_PX;

  function isStepPlayed(step: BoardPointerStep): boolean {
    setPointer(step.state);
    const { move } = step;
    if (move === null) return false;
    const isAccepted = onMove(move.uci);
    const isSoundDue = isAccepted && isMoveSoundOn;
    if (isSoundDue) playMoveSound(move.isCapture);
    return isAccepted;
  }

  return (
    <div
      className={STILL_PIECES_CLASS_BY_MOVABLE_SIDE[movableSide]}
      style={{ width: `${boardWidth + barWidth}px` }}
    >
      {evaluationBar === null ? null : <EvaluationBar view={evaluationBar} />}
      <div className="relative shrink-0" style={{ width: `${boardWidth}px` }}>
        <Chessboard
          options={{
            id: 'bors-board',
            position: fen,
            pieces: namedPieces,
            boardOrientation: orientation,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
            darkSquareNotationStyle: { color: theme.light },
            lightSquareNotationStyle: { color: theme.dark },
            alphaNotationStyle: { ...NOTATION_STYLE, position: 'absolute', bottom: 1, right: 3 },
            numericNotationStyle: { ...NOTATION_STYLE, position: 'absolute', top: 1, left: 3 },
            boardStyle: { borderRadius: BOARD_BORDER_RADIUS },
            dropSquareStyle: DROP_SQUARE_STYLE,
            draggingPieceStyle: DRAGGING_PIECE_STYLE,
            arrowOptions: {
              ...defaultArrowOptions,
              colors: { ...defaultArrowOptions.colors, default: theme.arrow },
            },
            arrows,
            squareStyles,
            animationDurationInMs: MOVE_ANIMATION_MS,
            allowDragging: movableSide !== 'none',
            canDragPiece: ({ piece }) => isPieceMovable(piece.pieceType, movableSide),
            onPieceDrag: ({ square }) => {
              setPointer(selectDragStartState(pointer, square));
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              isStepPlayed(selectDropStep(pointer, sourceSquare, targetSquare)),
            onSquareClick: ({ piece, square }) => {
              isStepPlayed(
                selectTapStep(
                  pointer,
                  { square, pieceType: piece?.pieceType ?? null },
                  movableSide,
                ),
              );
            },
            onSquareMouseDown: ({ square }, event) => {
              const isSecondaryButton = event.button === SECONDARY_MOUSE_BUTTON;
              if (isSecondaryButton) setPointer(selectRightPressState(pointer, square));
            },
            onSquareMouseUp: ({ square }, event) => {
              const isSecondaryButton = event.button === SECONDARY_MOUSE_BUTTON;
              if (isSecondaryButton) setPointer(selectRightReleaseState(pointer, square));
            },
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
        {isPromotionAsked ? (
          <div className="absolute inset-0 z-30">
            <button
              type="button"
              aria-label={t('board.promotion.cancel')}
              className="absolute inset-0 bg-scrim"
              onClick={() => {
                setPointer(buildBoardPointerState(fen));
              }}
            />
            {promotionChoices.map((choice) => (
              <button
                key={choice.piece}
                type="button"
                aria-label={t(choice.labelKey)}
                className={PROMOTION_CHOICE_CLASS}
                style={{
                  left: `${choice.leftPercent}%`,
                  top: `${choice.topPercent}%`,
                  width: '12.5%',
                  height: '12.5%',
                }}
                onClick={() => {
                  isStepPlayed(selectPromotionStep(pointer, choice.piece));
                }}
              >
                {defaultPieces[choice.pieceType]?.()}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
