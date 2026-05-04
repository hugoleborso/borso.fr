import type { CustomPieces } from 'react-chessboard/dist/chessboard/types';

const PIECE_BASE_URL = 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150';

const pieceUrls: Record<string, string> = {
  wP: `${PIECE_BASE_URL}/wp.png`,
  wR: `${PIECE_BASE_URL}/wr.png`,
  wN: `${PIECE_BASE_URL}/wn.png`,
  wB: `${PIECE_BASE_URL}/wb.png`,
  wQ: `${PIECE_BASE_URL}/wq.png`,
  wK: `${PIECE_BASE_URL}/wk.png`,
  bP: `${PIECE_BASE_URL}/bp.png`,
  bR: `${PIECE_BASE_URL}/br.png`,
  bN: `${PIECE_BASE_URL}/bn.png`,
  bB: `${PIECE_BASE_URL}/bb.png`,
  bQ: `${PIECE_BASE_URL}/bq.png`,
  bK: `${PIECE_BASE_URL}/bk.png`,
};

export const chesscomPieces: CustomPieces = Object.fromEntries(
  Object.entries(pieceUrls).map(([piece, url]) => [
    piece,
    ({ squareWidth }) => (
      <img src={url} alt={piece} style={{ width: squareWidth, height: squareWidth }} />
    ),
  ]),
);
