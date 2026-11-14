import type { CSSProperties } from 'react';
import type { BoardTarget, PlayedSquares } from './board-moves.utils';

export interface BoardSquareLayers {
  givenStyles: Readonly<Record<string, CSSProperties>>;
  playedSquares: PlayedSquares | null;
  selectedSquare: string | null;
  targets: readonly BoardTarget[];
  checkedKingSquares: readonly string[];
  markedSquares: readonly string[];
  highlightColour: string;
}

const HINT_INK = 'rgba(17, 17, 17, 0.26)';
const DOT_IMAGE = `radial-gradient(circle, ${HINT_INK} 21%, transparent 22%)`;
const RING_IMAGE = `radial-gradient(circle, transparent 74%, ${HINT_INK} 75%)`;
const CHECK_IMAGE =
  'radial-gradient(circle, rgba(213, 43, 30, 0.95) 0%, rgba(213, 43, 30, 0.65) 40%, transparent 72%)';
const MARK_COLOUR = 'rgba(213, 43, 30, 0.6)';

type SquareStyles = Record<string, CSSProperties>;

function paint(styles: SquareStyles, square: string, layer: CSSProperties): SquareStyles {
  return { ...styles, [square]: { ...styles[square], ...layer } };
}

function paintAll(
  styles: SquareStyles,
  squares: readonly string[],
  layer: CSSProperties,
): SquareStyles {
  return squares.reduce((painted, square) => paint(painted, square, layer), styles);
}

function listPlayedSquares(playedSquares: PlayedSquares | null): string[] {
  return playedSquares === null ? [] : [playedSquares.fromSquare, playedSquares.toSquare];
}

function listSelected(selectedSquare: string | null): string[] {
  return selectedSquare === null ? [] : [selectedSquare];
}

// @FollowsBlueprint utils-pure-module
export function buildBoardSquareStyles(layers: BoardSquareLayers): SquareStyles {
  const highlight: CSSProperties = { backgroundColor: layers.highlightColour };
  const highlighted = paintAll(
    paintAll(layers.givenStyles, listPlayedSquares(layers.playedSquares), highlight),
    listSelected(layers.selectedSquare),
    highlight,
  );
  const marked = paintAll(highlighted, layers.markedSquares, { backgroundColor: MARK_COLOUR });
  const checked = paintAll(marked, layers.checkedKingSquares, { backgroundImage: CHECK_IMAGE });
  return layers.targets.reduce(
    (painted, target) =>
      paint(painted, target.square, { backgroundImage: target.isCapture ? RING_IMAGE : DOT_IMAGE }),
    checked,
  );
}
