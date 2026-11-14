import { describe, expect, it } from 'vitest';
import { type BoardSquareLayers, buildBoardSquareStyles } from './board-square-styles.utils';

const HIGHLIGHT = '#ffda79';
const DOT = 'radial-gradient(circle, rgba(17, 17, 17, 0.26) 21%, transparent 22%)';
const RING = 'radial-gradient(circle, transparent 74%, rgba(17, 17, 17, 0.26) 75%)';
const CHECK =
  'radial-gradient(circle, rgba(213, 43, 30, 0.95) 0%, rgba(213, 43, 30, 0.65) 40%, transparent 72%)';
const MARK = 'rgba(213, 43, 30, 0.6)';

const NO_LAYERS: BoardSquareLayers = {
  givenStyles: {},
  playedSquares: null,
  selectedSquare: null,
  targets: [],
  checkedKingSquares: [],
  markedSquares: [],
  highlightColour: HIGHLIGHT,
};

// @FollowsBlueprint test-pure-unit
describe('buildBoardSquareStyles', () => {
  it('styles nothing on a quiet board', () => {
    expect(buildBoardSquareStyles(NO_LAYERS)).toEqual({});
  });

  it('highlights both squares of the last move and the selected piece', () => {
    expect(
      buildBoardSquareStyles({
        ...NO_LAYERS,
        playedSquares: { fromSquare: 'e2', toSquare: 'e4' },
        selectedSquare: 'g1',
      }),
    ).toEqual({
      e2: { backgroundColor: HIGHLIGHT },
      e4: { backgroundColor: HIGHLIGHT },
      g1: { backgroundColor: HIGHLIGHT },
    });
  });

  it('draws a dot on a legal empty square and a ring on a legal capture', () => {
    expect(
      buildBoardSquareStyles({
        ...NO_LAYERS,
        targets: [
          { square: 'e5', isCapture: false, isPromotion: false },
          { square: 'd5', isCapture: true, isPromotion: false },
        ],
      }),
    ).toEqual({ e5: { backgroundImage: DOT }, d5: { backgroundImage: RING } });
  });

  it('glows under a king in check and fills a marked square', () => {
    expect(
      buildBoardSquareStyles({ ...NO_LAYERS, checkedKingSquares: ['e1'], markedSquares: ['d4'] }),
    ).toEqual({ e1: { backgroundImage: CHECK }, d4: { backgroundColor: MARK } });
  });

  it('keeps the styles it is given and lays its own over them', () => {
    expect(
      buildBoardSquareStyles({
        ...NO_LAYERS,
        givenStyles: { e4: { backgroundColor: 'blue', opacity: 0.5 } },
        playedSquares: { fromSquare: 'e2', toSquare: 'e4' },
        markedSquares: ['e2'],
        targets: [{ square: 'e4', isCapture: true, isPromotion: false }],
      }),
    ).toEqual({
      e2: { backgroundColor: MARK },
      e4: { backgroundColor: HIGHLIGHT, opacity: 0.5, backgroundImage: RING },
    });
  });
});
