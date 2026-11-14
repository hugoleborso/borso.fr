import type { Side } from '@/state/persistedState.utils';

export type PieceCode = `${'w' | 'b'}${'P' | 'N' | 'B' | 'R' | 'Q' | 'K'}`;

export interface PlacedSquare {
  square: string;
  isDark: boolean;
  piece: PieceCode | null;
}

const FILES = 'abcdefgh';
const RANK_COUNT = 8;
const SQUARE_COLOUR_PERIOD = 2;

const PIECE_CODE_BY_FEN_LETTER: Readonly<Record<string, PieceCode>> = {
  P: 'wP',
  N: 'wN',
  B: 'wB',
  R: 'wR',
  Q: 'wQ',
  K: 'wK',
  p: 'bP',
  n: 'bN',
  b: 'bB',
  r: 'bR',
  q: 'bQ',
  k: 'bK',
};

function expandRank(rankField: string): (PieceCode | null)[] {
  return rankField.split('').flatMap((letter) => {
    const piece = PIECE_CODE_BY_FEN_LETTER[letter];
    if (piece !== undefined) return [piece];
    return Array.from({ length: Number(letter) }, () => null);
  });
}

// @FollowsBlueprint utils-pure-module
export function readBoardPlacement(fen: string, orientation: Side): PlacedSquare[] {
  const placementField = fen.replace(/ .*/, '');
  const squares = placementField.split('/').flatMap((rankField, rowIndex) => {
    const rank = RANK_COUNT - rowIndex;
    return expandRank(rankField).map((piece, fileIndex) => ({
      square: `${FILES.charAt(fileIndex)}${rank}`,
      isDark: (fileIndex + rank) % SQUARE_COLOUR_PERIOD === 1,
      piece,
    }));
  });
  return orientation === 'white' ? squares : squares.reverse();
}
