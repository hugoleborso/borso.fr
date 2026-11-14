import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { buildDeckPreviewFen, buildLineEndFen } from './previews.utils';

const e4Line = { movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'] };
const sideLine = { movesSan: ['e4', 'e5', 'd4'] };

function fenAfter(movesSan: string[]): string {
  const chess = new Chess();
  for (const san of movesSan) chess.move(san);
  return chess.fen();
}

// @FollowsBlueprint test-pure-unit
describe('buildDeckPreviewFen', () => {
  it("shows the deck's first line at the configured ply depth", () => {
    expect(buildDeckPreviewFen([e4Line, sideLine])).toBe(fenAfter(e4Line.movesSan.slice(0, 6)));
  });

  it('shows the starting position for a deck with no lines', () => {
    expect(buildDeckPreviewFen([])).toBe(new Chess().fen());
  });
});

describe('buildLineEndFen', () => {
  it('plays every move of the line, past the preview depth', () => {
    expect(buildLineEndFen(e4Line.movesSan)).toBe(fenAfter(e4Line.movesSan));
  });

  it('stops at the first move the board refuses instead of skipping it', () => {
    expect(buildLineEndFen(['e4', 'Ke7', 'e5'])).toBe(fenAfter(['e4']));
  });

  it('shows the starting position for a line with no moves', () => {
    expect(buildLineEndFen([])).toBe(new Chess().fen());
  });
});
