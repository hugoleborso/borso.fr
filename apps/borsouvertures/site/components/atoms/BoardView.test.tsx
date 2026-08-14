import { Chess } from 'chess.js';
import { i18next } from '@/i18n/i18n';
import { render, screen } from '@testing-library/react';
import { defaultPieces } from 'react-chessboard';
import { beforeEach, describe, expect, it } from 'vitest';
import { BoardView } from './BoardView';
import { buildNamedPieces } from './boardPieces';

const STARTING_FEN = new Chess().fen();
const BOARD_WIDTH_PX = 320;

function renderStartingBoard() {
  return render(
    <BoardView
      orientation="white"
      fen={STARTING_FEN}
      onMove={() => false}
      arrows={[]}
      highlightSquares={{}}
      boardStyleId="chesscom"
      boardWidth={BOARD_WIDTH_PX}
    />,
  );
}

beforeEach(async () => {
  await i18next.changeLanguage('en');
});

// @FollowsBlueprint test-component-render
describe('BoardView', () => {
  it('names every draggable piece after the piece and the square it stands on', () => {
    renderStartingBoard();
    expect(screen.getByRole('button', { name: 'white knight on g1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'black queen on d8' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /^white pawn on/ })).toHaveLength(8);
  });

  it('names the pieces in the active language', async () => {
    await i18next.changeLanguage('fr');
    renderStartingBoard();
    expect(screen.getByRole('button', { name: 'tour blanche en a1' })).toBeDefined();
  });

  it('labels exactly the pieces the chessboard library ships', () => {
    const labelled = Object.keys(buildNamedPieces(i18next.t)).sort();
    expect(labelled).toEqual(Object.keys(defaultPieces).sort());
  });
});
