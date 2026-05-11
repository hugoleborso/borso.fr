import { Chess } from 'chess.js';
import type { Line, Opening, Variation } from './types';

const PREVIEW_PLY_DEPTH = 6;
const MAIN_LINE_HINT = 'main';

export interface OpeningPreview {
  openingId: string;
  fen: string;
}

export interface VariationPreview {
  openingId: string;
  variationId: string;
  fen: string;
}

export interface LinePreview {
  openingId: string;
  variationId: string;
  lineId: string;
  fen: string;
}

export function buildOpeningPreview(opening: Opening): OpeningPreview {
  const mainVariation = opening.variations.find((variation) =>
    variation.name.toLowerCase().includes(MAIN_LINE_HINT),
  );
  const previewLine = mainVariation?.lines[0] ?? opening.variations[0]?.lines[0];
  const fen = previewLine ? playMoves(previewLine.movesSan, PREVIEW_PLY_DEPTH) : new Chess().fen();
  return { openingId: opening.id, fen };
}

export function buildVariationPreview(opening: Opening, variation: Variation): VariationPreview {
  const previewLine = variation.lines[0];
  const fen = previewLine ? playMoves(previewLine.movesSan, PREVIEW_PLY_DEPTH) : new Chess().fen();
  return { openingId: opening.id, variationId: variation.id, fen };
}

export function buildLinePreview(opening: Opening, variation: Variation, line: Line): LinePreview {
  const fen = playMoves(line.movesSan, PREVIEW_PLY_DEPTH);
  return { openingId: opening.id, variationId: variation.id, lineId: line.id, fen };
}

function playMoves(movesSan: string[], maxPlies: number): string {
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
