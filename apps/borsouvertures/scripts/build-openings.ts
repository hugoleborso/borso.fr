import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Chess } from 'chess.js';
import { buildLineId, toSlug } from '../site/src/openings/openingIds.utils.js';

interface RawRow {
  eco: string;
  name: string;
  pgn: string;
}

interface Opening {
  id: string;
  name: string;
  ecoCodes: string[];
  variations: Variation[];
}

interface Variation {
  id: string;
  name: string;
  lines: Line[];
}

interface Line {
  id: string;
  name: string;
  eco: string;
  movesSan: string[];
  movesUci: string[];
}

const BUNDLED_OUTPUT_PATH = path.resolve('site/src/openings/openings.json');
const PUBLIC_OUTPUT_PATH = path.resolve('site/public/openings.json');
const CACHE_VERSION_PATH = path.resolve('site/src/config/openingsCacheVersion.ts');
const LICHESS_COMMIT = 'refs/heads/master';
const TSV_FILES = ['a', 'b', 'c', 'd', 'e'];
const ECO_NAME_PGN_COLUMN_COUNT = 3;
const JSON_INDENT_SPACES = 2;
const CACHE_VERSION_RADIX = 36;
const FAMILIES_MOST_SPECIFIC_FIRST = [
  "Queen's Gambit Declined",
  "Queen's Gambit Accepted",
  "Queen's Gambit",
  "King's Indian Defense",
  "King's Gambit",
  "Petrov's Defense",
  'Scandinavian Defense',
  'Caro-Kann Defense',
  'Italian Game',
  'Sicilian Defense',
  'Ruy Lopez',
  'French Defense',
  'Nimzo-Indian Defense',
  'English Opening',
  'Vienna Game',
  'Scotch Game',
  'Four Knights Game',
  'Pirc Defense',
  'Modern Defense',
  'Catalan Opening',
];

async function fetchTsv(letter: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/${LICHESS_COMMIT}/${letter}.tsv`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function parseTsv(tsv: string): RawRow[] {
  const lines = tsv.trim().split('\n');
  const headerRemoved = lines[0]?.startsWith('eco') ? lines.slice(1) : lines;
  return headerRemoved
    .map((line) => line.split('\t'))
    .filter(
      (cols): cols is [string, string, string, ...string[]] =>
        cols.length >= ECO_NAME_PGN_COLUMN_COUNT,
    )
    .map(([eco, name, pgn]) => ({ eco, name, pgn }));
}

function extractVariation(name: string): { variation: string; lineName: string } {
  if (!name.includes(':')) return { variation: 'Main Line', lineName: name };
  const [, rest] = name.split(':');
  const [variation] = (rest ?? '').split(',');
  return { variation: (variation ?? '').trim() || 'Main Line', lineName: name };
}

function convertPgnToMoves(pgn: string): { movesSan: string[]; movesUci: string[] } {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });
  return {
    movesSan: history.map((entry) => entry.san),
    movesUci: history.map((entry) => `${entry.from}${entry.to}${entry.promotion ?? ''}`),
  };
}

function assertUniqueLineIds(openings: Opening[]): void {
  const seenIds = new Set<string>();
  for (const opening of openings) {
    for (const variation of opening.variations) {
      for (const line of variation.lines) {
        const key = `${opening.id}/${variation.id}/${line.id}`;
        if (seenIds.has(key)) {
          throw new Error(`Duplicate line id ${line.id} in ${opening.id}/${variation.id}`);
        }
        seenIds.add(key);
      }
    }
  }
}

function assertEveryFamilyMatched(openings: ReadonlyMap<string, Opening>): void {
  const missing = FAMILIES_MOST_SPECIFIC_FIRST.filter(
    (familyName) => !openings.has(toSlug(familyName)),
  );
  if (missing.length === 0) return;
  throw new Error(
    `${String(missing.length)} of ${String(FAMILIES_MOST_SPECIFIC_FIRST.length)} families matched no row: ${missing.join(', ')}. ` +
      'Either the name does not match the source rows, or an earlier family in the list is a prefix of it.',
  );
}

async function buildOpenings(): Promise<void> {
  const openingsMap = new Map<string, Opening>();

  for (const letter of TSV_FILES) {
    const tsv = await fetchTsv(letter);
    const rows = parseTsv(tsv);
    for (const row of rows) {
      const family = FAMILIES_MOST_SPECIFIC_FIRST.find((familyName) =>
        row.name.startsWith(familyName),
      );
      if (!family) continue;

      const openingId = toSlug(family);
      let opening = openingsMap.get(openingId);
      if (!opening) {
        opening = { id: openingId, name: family, ecoCodes: [], variations: [] };
        openingsMap.set(openingId, opening);
      }
      if (!opening.ecoCodes.includes(row.eco)) opening.ecoCodes.push(row.eco);

      const { variation, lineName } = extractVariation(row.name);
      const variationId = toSlug(variation);
      let variationEntry = opening.variations.find((entry) => entry.id === variationId);
      if (!variationEntry) {
        variationEntry = { id: variationId, name: variation, lines: [] };
        opening.variations.push(variationEntry);
      }

      const { movesSan, movesUci } = convertPgnToMoves(row.pgn);
      variationEntry.lines.push({
        id: buildLineId(lineName, movesUci),
        name: lineName,
        eco: row.eco,
        movesSan,
        movesUci,
      });
    }
  }

  assertEveryFamilyMatched(openingsMap);

  const openings = Array.from(openingsMap.values()).map((opening) => ({
    ...opening,
    variations: opening.variations.map((variation) => ({
      ...variation,
      lines: variation.lines.sort((left, right) => left.name.localeCompare(right.name)),
    })),
  }));
  assertUniqueLineIds(openings);

  await mkdir(path.dirname(BUNDLED_OUTPUT_PATH), { recursive: true });
  await mkdir(path.dirname(PUBLIC_OUTPUT_PATH), { recursive: true });
  await mkdir(path.dirname(CACHE_VERSION_PATH), { recursive: true });
  const contents = JSON.stringify(openings, null, JSON_INDENT_SPACES);
  await writeFile(BUNDLED_OUTPUT_PATH, contents, 'utf-8');
  await writeFile(PUBLIC_OUTPUT_PATH, contents, 'utf-8');
  const version = Date.now().toString(CACHE_VERSION_RADIX);
  await writeFile(
    CACHE_VERSION_PATH,
    `export const OPENINGS_CACHE_VERSION = '${version}';\n`,
    'utf-8',
  );
  console.log(
    `Wrote ${openings.length} openings to ${BUNDLED_OUTPUT_PATH} and ${PUBLIC_OUTPUT_PATH} with cache version ${version}`,
  );
}

buildOpenings().catch((error) => {
  console.error(error);
  process.exit(1);
});
