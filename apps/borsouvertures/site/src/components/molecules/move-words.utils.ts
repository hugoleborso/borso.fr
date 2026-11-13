import type { TFunction } from 'i18next';
import { PIECE_LABEL_KEY_BY_TYPE } from '@/components/atoms/boardPieces';
import type { LineMoveKind, MoveFacts } from '@/decks/card.core';
import type { Side } from '@/state/persistedState.utils';

const KINGSIDE_KEY_BY_SIDE = {
  white: 'decks.line-stepper.castle.kingside-white',
  black: 'decks.line-stepper.castle.kingside-black',
} as const satisfies Record<Side, string>;

const QUEENSIDE_KEY_BY_SIDE = {
  white: 'decks.line-stepper.castle.queenside-white',
  black: 'decks.line-stepper.castle.queenside-black',
} as const satisfies Record<Side, string>;

function describePieceMove(translate: TFunction, move: MoveFacts): string {
  return translate(PIECE_LABEL_KEY_BY_TYPE[move.piece], { square: move.fromSquare });
}

// @FollowsBlueprint component-lookup-table
const DESCRIBE_BY_KIND = {
  move: (translate, move) =>
    translate('decks.line-stepper.move', {
      piece: describePieceMove(translate, move),
      square: move.toSquare,
    }),
  capture: (translate, move) =>
    translate('decks.line-stepper.capture', {
      piece: describePieceMove(translate, move),
      square: move.toSquare,
    }),
  'castle-kingside': (translate, move) => translate(KINGSIDE_KEY_BY_SIDE[move.mover]),
  'castle-queenside': (translate, move) => translate(QUEENSIDE_KEY_BY_SIDE[move.mover]),
} as const satisfies Record<LineMoveKind, (translate: TFunction, move: MoveFacts) => string>;

// @FollowsBlueprint utils-pure-module
export function describeMoveInWords(translate: TFunction, move: MoveFacts | null): string {
  if (move === null) return '';
  return DESCRIBE_BY_KIND[move.kind](translate, move);
}
