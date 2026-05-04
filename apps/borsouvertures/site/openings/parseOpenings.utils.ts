import type { Line, Opening, Variation } from './types';

/**
 * Validate the shape of `openings.json` at runtime. The file is checked into
 * the repo and produced by `scripts/build-openings.ts`, so a malformed payload
 * would already break the build — but the bundled-fallback and `fetch()` paths
 * both come from outside the type system, so we re-validate at the boundary
 * instead of leaning on a type assertion.
 */
export function parseOpenings(value: unknown): Opening[] {
  if (!Array.isArray(value)) throw new Error('openings.json: root is not an array');
  return value.map(parseOpening);
}

function parseOpening(value: unknown): Opening {
  if (!isPlainRecord(value)) throw new Error('openings.json: opening entry is not an object');
  const id = expectString(value.id, 'opening.id');
  const name = expectString(value.name, 'opening.name');
  const ecoCodes = expectStringArray(value.ecoCodes, 'opening.ecoCodes');
  const variations = expectArray(value.variations, 'opening.variations').map(parseVariation);
  return { id, name, ecoCodes, variations };
}

function parseVariation(value: unknown): Variation {
  if (!isPlainRecord(value)) throw new Error('openings.json: variation entry is not an object');
  const id = expectString(value.id, 'variation.id');
  const name = expectString(value.name, 'variation.name');
  const lines = expectArray(value.lines, 'variation.lines').map(parseLine);
  return { id, name, lines };
}

function parseLine(value: unknown): Line {
  if (!isPlainRecord(value)) throw new Error('openings.json: line entry is not an object');
  return {
    id: expectString(value.id, 'line.id'),
    name: expectString(value.name, 'line.name'),
    eco: expectString(value.eco, 'line.eco'),
    movesSan: expectStringArray(value.movesSan, 'line.movesSan'),
    movesUci: expectStringArray(value.movesUci, 'line.movesUci'),
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`openings.json: ${field} is not a string`);
  return value;
}

function expectArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`openings.json: ${field} is not an array`);
  return value;
}

function expectStringArray(value: unknown, field: string): string[] {
  return expectArray(value, field).map((entry, index) => expectString(entry, `${field}[${index}]`));
}
