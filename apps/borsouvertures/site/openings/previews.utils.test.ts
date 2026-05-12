import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { buildLinePreview, buildOpeningPreview, buildVariationPreview } from './previews.utils';
import type { Line, Opening, Variation } from './types';

const e4Line: Line = {
  id: 'a',
  name: 'A',
  eco: 'C20',
  movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'],
  movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4'],
};

const sideLine: Line = {
  id: 'b',
  name: 'B',
  eco: 'C21',
  movesSan: ['e4', 'e5', 'd4'],
  movesUci: ['e2e4', 'e7e5', 'd2d4'],
};

const mainVariation: Variation = {
  id: 'main',
  name: 'Main Line',
  lines: [e4Line],
};

const otherVariation: Variation = {
  id: 'side',
  name: 'Side',
  lines: [sideLine],
};

const opening: Opening = {
  id: 'opening',
  name: 'Opening',
  ecoCodes: ['C20'],
  variations: [otherVariation, mainVariation],
};

describe('buildOpeningPreview', () => {
  it('uses the main-line variation when present', () => {
    const preview = buildOpeningPreview(opening);
    expect(preview.openingId).toBe('opening');
    expect(preview.fen).not.toBe(new Chess().fen());
  });

  it('falls back to the first variation when no main-line is found', () => {
    const noMain: Opening = {
      ...opening,
      variations: [otherVariation],
    };
    const preview = buildOpeningPreview(noMain);
    expect(preview.openingId).toBe('opening');
  });

  it('returns the starting position when the opening is empty', () => {
    const empty: Opening = {
      id: 'e',
      name: 'E',
      ecoCodes: [],
      variations: [],
    };
    expect(buildOpeningPreview(empty).fen).toBe(new Chess().fen());
  });

  it('returns the starting position when the variation has no lines', () => {
    const empty: Opening = {
      id: 'e',
      name: 'E',
      ecoCodes: [],
      variations: [{ id: 'v', name: 'V', lines: [] }],
    };
    expect(buildOpeningPreview(empty).fen).toBe(new Chess().fen());
  });
});

describe('buildVariationPreview', () => {
  it('plays the first line of the variation', () => {
    const preview = buildVariationPreview(opening, mainVariation);
    expect(preview).toMatchObject({ openingId: 'opening', variationId: 'main' });
    expect(preview.fen).not.toBe(new Chess().fen());
  });

  it('returns the starting position when the variation has no lines', () => {
    const empty: Variation = { id: 'v', name: 'V', lines: [] };
    expect(buildVariationPreview(opening, empty).fen).toBe(new Chess().fen());
  });
});

describe('buildLinePreview', () => {
  it('plays the configured ply depth', () => {
    const preview = buildLinePreview(opening, mainVariation, e4Line);
    expect(preview).toMatchObject({
      openingId: 'opening',
      variationId: 'main',
      lineId: 'a',
    });
    const reference = new Chess();
    for (const san of e4Line.movesSan.slice(0, 6)) reference.move(san);
    expect(preview.fen).toBe(reference.fen());
  });

  it('stops applying SAN moves when an entry is invalid', () => {
    const broken: Line = {
      id: 'broken',
      name: 'Broken',
      eco: 'Z00',
      movesSan: ['e4', 'totally-bogus'],
      movesUci: ['e2e4', 'zzzz'],
    };
    const reference = new Chess();
    reference.move('e4');
    expect(buildLinePreview(opening, mainVariation, broken).fen).toBe(reference.fen());
  });
});
