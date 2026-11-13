import { Chess } from 'chess.js';
import { i18next } from '@/i18n/i18n';
import { render, screen } from '@testing-library/react';
import { defaultPieces } from 'react-chessboard';
import { beforeEach, describe, expect, it } from 'vitest';
import { BoardView } from './BoardView';
import type { BoardMark } from './board-mark.utils';
import { buildNamedPieces } from './boardPieces';

const STARTING_FEN = new Chess().fen();
const BOARD_WIDTH_PX = 320;

function renderStartingBoard(mark: BoardMark | null = null) {
  return render(
    <BoardView
      orientation="white"
      fen={STARTING_FEN}
      onMove={() => false}
      arrows={[]}
      highlightSquares={{}}
      boardStyleId="chesscom"
      boardWidth={BOARD_WIDTH_PX}
      mark={mark}
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

  it('draws no mark until the card is answered', () => {
    renderStartingBoard();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws the mark over the board at the place it is given, named for the reader', () => {
    renderStartingBoard({ tone: 'missed', square: 'd5' });
    const mark = screen.getByRole('img', { name: 'Missed' });
    expect([mark.style.left, mark.style.top, mark.style.width]).toEqual([
      '46.25%',
      '33.75%',
      '7.5%',
    ]);
    expect(mark.getAttribute('class')).toContain('bg-missed');
  });

  it('centres the check on the board', () => {
    renderStartingBoard({ tone: 'recalled', square: null });
    const mark = screen.getByRole('img', { name: 'Recalled' });
    expect([mark.style.left, mark.style.top, mark.style.width]).toEqual(['36%', '36%', '28%']);
    expect(mark.getAttribute('class')).toContain('bg-recalled');
  });
});
