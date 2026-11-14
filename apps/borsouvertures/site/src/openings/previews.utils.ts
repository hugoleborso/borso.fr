import { Chess } from 'chess.js';

const PREVIEW_PLY_DEPTH = 6;

export interface PreviewedLine {
  movesSan: readonly string[];
}

// @FollowsBlueprint utils-pure-module
export function buildDeckPreviewFen(lines: readonly PreviewedLine[]): string {
  const previewLine = lines[0];
  return previewLine ? playMoves(previewLine.movesSan, PREVIEW_PLY_DEPTH) : new Chess().fen();
}

export function buildLineEndFen(movesSan: readonly string[]): string {
  return playMoves(movesSan, movesSan.length);
}

function playMoves(movesSan: readonly string[], maxPlies: number): string {
  const chess = new Chess();
  for (const san of movesSan.slice(0, maxPlies)) {
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess.fen();
}
