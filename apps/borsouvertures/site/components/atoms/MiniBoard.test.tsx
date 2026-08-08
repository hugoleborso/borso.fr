import { Chess } from 'chess.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiniBoard } from './MiniBoard';
import { SelectorCard } from './SelectorCard';

const STARTING_FEN = new Chess().fen();

describe('MiniBoard', () => {
  it('exposes no target of its own, so the card around it stays the only one', () => {
    render(
      <SelectorCard
        label="Italian Game"
        meta="2 variations"
        isActive={false}
        onSelect={() => undefined}
        board={<MiniBoard fen={STARTING_FEN} boardStyleId="chesscom" />}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('marks the decorative board inert, so its squares leave the tab order', () => {
    const { container } = render(<MiniBoard fen={STARTING_FEN} boardStyleId="chesscom" />);
    expect(container.firstElementChild?.hasAttribute('inert')).toBe(true);
  });
});
