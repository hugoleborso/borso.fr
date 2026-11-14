import { Chess } from 'chess.js';
import { i18next } from '@/i18n/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { defaultPieces } from 'react-chessboard';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playMoveSound } from '@/lib/move-sound.setup';
import {
  type EvaluationBarView,
  selectEvaluationBarView,
} from '@/opponent/stockfish-evaluation.core';
import { BoardView } from './BoardView';
import type { BoardMark } from './board-mark.utils';
import { buildNamedPieces } from './boardPieces';

vi.mock('@/lib/move-sound.setup', () => ({ playMoveSound: vi.fn() }));

const STARTING_FEN = new Chess().fen();
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const WHITE_PROMOTES = 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1';
const WHITE_IN_CHECK = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const BOARD_WIDTH_PX = 320;
const HIGHLIGHT = 'rgb(255, 218, 121)';

interface PlayableBoardOptions {
  fen?: string;
  onMove?: (uci: string) => boolean;
  evaluationBar?: EvaluationBarView | null;
  isMoveSoundOn?: boolean;
}

function renderPlayableBoard({
  fen = STARTING_FEN,
  onMove = () => true,
  evaluationBar = null,
  isMoveSoundOn = false,
}: PlayableBoardOptions = {}) {
  return render(
    <BoardView
      orientation="white"
      fen={fen}
      onMove={onMove}
      mover="both"
      arrows={[]}
      highlightSquares={{}}
      boardStyleId="chesscom"
      boardWidth={BOARD_WIDTH_PX}
      mark={null}
      evaluationBar={evaluationBar}
      isMoveSoundOn={isMoveSoundOn}
    />,
  );
}

function readSquareLayer(square: string): CSSStyleDeclaration {
  const layer = document.querySelector(`[data-square="${square}"]`)?.lastElementChild;
  if (!(layer instanceof HTMLElement)) throw new Error(`no square ${square}`);
  return layer.style;
}

function tapSquare(square: string): void {
  const element = document.querySelector(`[data-square="${square}"]`);
  if (element === null) throw new Error(`no square ${square}`);
  fireEvent.click(element, { button: 0 });
}

function renderStartingBoard(mark: BoardMark | null = null) {
  return render(
    <BoardView
      orientation="white"
      fen={STARTING_FEN}
      onMove={() => false}
      mover="both"
      arrows={[]}
      highlightSquares={{}}
      boardStyleId="chesscom"
      boardWidth={BOARD_WIDTH_PX}
      mark={mark}
      evaluationBar={null}
      isMoveSoundOn={false}
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

describe('BoardView taps and drops', () => {
  beforeEach(() => {
    vi.mocked(playMoveSound).mockClear();
  });

  it('dots the legal squares of a tapped piece and plays it on a second tap', () => {
    const onMove = vi.fn(() => true);
    renderPlayableBoard({ onMove });
    tapSquare('e2');
    expect(readSquareLayer('e2').backgroundColor).toBe(HIGHLIGHT);
    expect(readSquareLayer('e4').backgroundImage).toContain('21%');
    expect(readSquareLayer('e3').backgroundImage).toContain('21%');
    expect(readSquareLayer('e5').backgroundImage).toBe('');
    tapSquare('e4');
    expect(onMove).toHaveBeenCalledWith('e2e4');
    expect(readSquareLayer('e4').backgroundImage).toBe('');
  });

  it('plays the move sound for an accepted move only when the reader turned it on', () => {
    renderPlayableBoard({ isMoveSoundOn: true });
    tapSquare('g1');
    tapSquare('f3');
    expect(playMoveSound).toHaveBeenCalledWith(false);
  });

  it('stays silent when the sound is off or the move is refused', () => {
    const { unmount } = renderPlayableBoard();
    tapSquare('g1');
    tapSquare('f3');
    unmount();
    renderPlayableBoard({ isMoveSoundOn: true, onMove: () => false });
    tapSquare('g1');
    tapSquare('f3');
    expect(playMoveSound).not.toHaveBeenCalled();
  });

  it('asks for the promotion piece over the promotion square and plays the one chosen', () => {
    const onMove = vi.fn(() => true);
    renderPlayableBoard({ fen: WHITE_PROMOTES, onMove });
    tapSquare('b7');
    tapSquare('b8');
    expect(onMove).not.toHaveBeenCalled();
    const queen = screen.getByRole('button', { name: 'Promote to a queen' });
    expect([queen.style.left, queen.style.top]).toEqual(['12.5%', '0%']);
    fireEvent.click(screen.getByRole('button', { name: 'Promote to a knight' }));
    expect(onMove).toHaveBeenCalledWith('b7b8n');
    expect(screen.queryByRole('button', { name: 'Promote to a queen' })).toBeNull();
  });

  it('cancels the promotion on a tap outside the choices', () => {
    const onMove = vi.fn(() => true);
    renderPlayableBoard({ fen: WHITE_PROMOTES, onMove });
    tapSquare('b7');
    tapSquare('a8');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel the promotion' }));
    expect(screen.queryByRole('button', { name: 'Promote to a queen' })).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('highlights the last move once the position moves on by one move', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, BOARD_WIDTH_PX / 8, BOARD_WIDTH_PX / 8),
    );
    const { rerender } = renderPlayableBoard();
    expect(readSquareLayer('e2').backgroundColor).toBe('');
    rerender(
      <BoardView
        orientation="white"
        fen={AFTER_E4}
        onMove={() => true}
        mover="both"
        arrows={[]}
        highlightSquares={{}}
        boardStyleId="chesscom"
        boardWidth={BOARD_WIDTH_PX}
        mark={null}
        evaluationBar={null}
        isMoveSoundOn={false}
      />,
    );
    expect(readSquareLayer('e2').backgroundColor).toBe(HIGHLIGHT);
    expect(readSquareLayer('e4').backgroundColor).toBe(HIGHLIGHT);
    vi.restoreAllMocks();
  });

  it('glows under a king in check', () => {
    renderPlayableBoard({ fen: WHITE_IN_CHECK });
    expect(readSquareLayer('e1').backgroundImage).toContain('213, 43, 30');
  });

  it('marks a square on a right click and clears it on the next tap', () => {
    renderPlayableBoard();
    const square = document.querySelector('[data-square="d4"]');
    if (square === null) throw new Error('no square d4');
    fireEvent.mouseDown(square, { button: 2 });
    fireEvent.mouseUp(square, { button: 2 });
    expect(readSquareLayer('d4').backgroundColor).toBe('rgba(213, 43, 30, 0.6)');
    fireEvent.mouseDown(square, { button: 0 });
    fireEvent.mouseUp(square, { button: 0 });
    tapSquare('d4');
    expect(readSquareLayer('d4').backgroundColor).toBe('');
  });
});

describe('BoardView evaluation bar', () => {
  it('draws the bar beside the board, named for the reader, and widens the board by its width', () => {
    const { container } = renderPlayableBoard({
      evaluationBar: selectEvaluationBarView(
        { evaluation: { kind: 'centipawns', whiteCentipawns: 64 }, hasFailed: false },
        'white',
      ),
    });
    const bar = screen.getByRole('img', { name: 'Evaluation: White is better by 0.6' });
    expect(bar.textContent).toBe('+0.6');
    expect(bar.style.width).toBe('24px');
    expect(container.firstElementChild?.getAttribute('style')).toContain('width: 344px');
  });

  it('keeps the place of a bar Stockfish could not fill, and hides it', () => {
    renderPlayableBoard({
      evaluationBar: selectEvaluationBarView({ evaluation: null, hasFailed: true }, 'black'),
    });
    expect(
      screen.getByRole('img', { name: 'Evaluation: Stockfish is looking' }).className,
    ).toContain('invisible');
  });

  it('draws no bar when none is given', () => {
    const { container } = renderPlayableBoard();
    expect(screen.queryByRole('img', { name: /^Evaluation/ })).toBeNull();
    expect(container.firstElementChild?.getAttribute('style')).toContain('width: 320px');
  });
});
