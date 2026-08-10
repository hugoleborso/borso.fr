import type { TFunction } from 'i18next';
import type { CSSProperties } from 'react';
import { defaultPieces, type PieceRenderObject } from 'react-chessboard';

type PieceRenderProps = Parameters<PieceRenderObject[string]>[0];

const PIECE_LABEL_KEY_BY_TYPE = {
  wP: 'board.piece.white-pawn',
  wN: 'board.piece.white-knight',
  wB: 'board.piece.white-bishop',
  wR: 'board.piece.white-rook',
  wQ: 'board.piece.white-queen',
  wK: 'board.piece.white-king',
  bP: 'board.piece.black-pawn',
  bN: 'board.piece.black-knight',
  bB: 'board.piece.black-bishop',
  bR: 'board.piece.black-rook',
  bQ: 'board.piece.black-queen',
  bK: 'board.piece.black-king',
} as const;

const PIECE_LABEL_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

/**
 * react-chessboard wraps every piece in a `div[role="button"]` built by the
 * dnd-kit it embeds, and exposes no prop for that wrapper's attributes. A
 * command takes its accessible name from its contents, so the name has to be
 * rendered inside the piece — which the `pieces` option is the only hook for.
 */
export function buildNamedPieces(translate: TFunction): PieceRenderObject {
  return Object.fromEntries(
    Object.entries(PIECE_LABEL_KEY_BY_TYPE).map(([pieceType, labelKey]) => [
      pieceType,
      (props?: PieceRenderProps) => (
        <>
          {defaultPieces[pieceType]?.(props)}
          <span style={PIECE_LABEL_STYLE}>{translate(labelKey, { square: props?.square })}</span>
        </>
      ),
    ]),
  );
}
