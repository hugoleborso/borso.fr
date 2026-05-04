import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Chess } from 'chess.js';

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

const BUNDLED_OUTPUT_PATH = path.resolve('site/openings/openings.json');
const PUBLIC_OUTPUT_PATH = path.resolve('site/public/openings.json');
const CACHE_VERSION_PATH = path.resolve('site/config/openingsCacheVersion.ts');
const LICHESS_COMMIT = 'refs/heads/master';
const TSV_FILES = ['a', 'b', 'c', 'd', 'e'];
const FAMILIES = [
  'Scandinavian Defense',
  'Caro-Kann Defense',
  'Italian Game',
  'Giuoco Piano',
  'Sicilian Defense',
  'Ruy Lopez',
  'French Defense',
  "Queen's Gambit",
  "Queen's Gambit Declined",
  "Queen's Gambit Accepted",
  'King’s Indian Defense',
  'Nimzo-Indian Defense',
  'English Opening',
  'Petrov Defense',
  'Vienna Game',
  'Scotch Game',
  'Four Knights Game',
  'King’s Gambit',
  'Pirc Defense',
  'Modern Defense',
  'Catalan Opening',
];

async function fetchTsv(letter: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/${LICHESS_COMMIT}/${letter}.tsv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseTsv(tsv: string): RawRow[] {
  const lines = tsv.trim().split('\n');
  const headerRemoved = lines[0]?.startsWith('eco') ? lines.slice(1) : lines;
  return headerRemoved
    .map((line) => line.split('\t'))
    .filter((cols): cols is [string, string, string, ...string[]] => cols.length >= 3)
    .map(([eco, name, pgn]) => ({ eco, name, pgn }));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

async function buildOpenings(): Promise<void> {
  const openingsMap = new Map<string, Opening>();

  for (const letter of TSV_FILES) {
    const tsv = await fetchTsv(letter);
    const rows = parseTsv(tsv);
    for (const row of rows) {
      const family = FAMILIES.find((familyName) => row.name.startsWith(familyName));
      if (!family) continue;

      const openingId = slugify(family);
      let opening = openingsMap.get(openingId);
      if (!opening) {
        opening = { id: openingId, name: family, ecoCodes: [], variations: [] };
        openingsMap.set(openingId, opening);
      }
      if (!opening.ecoCodes.includes(row.eco)) opening.ecoCodes.push(row.eco);

      const { variation, lineName } = extractVariation(row.name);
      const variationId = slugify(variation);
      let variationEntry = opening.variations.find((entry) => entry.id === variationId);
      if (!variationEntry) {
        variationEntry = { id: variationId, name: variation, lines: [] };
        opening.variations.push(variationEntry);
      }

      const { movesSan, movesUci } = convertPgnToMoves(row.pgn);
      variationEntry.lines.push({
        id: slugify(lineName),
        name: lineName,
        eco: row.eco,
        movesSan,
        movesUci,
      });
    }
  }

  const openings = Array.from(openingsMap.values()).map((opening) => ({
    ...opening,
    variations: opening.variations.map((variation) => ({
      ...variation,
      lines: variation.lines.sort((a, b) => a.name.localeCompare(b.name)),
    })),
  }));

  await mkdir(path.dirname(BUNDLED_OUTPUT_PATH), { recursive: true });
  await mkdir(path.dirname(PUBLIC_OUTPUT_PATH), { recursive: true });
  await mkdir(path.dirname(CACHE_VERSION_PATH), { recursive: true });
  const contents = JSON.stringify(openings, null, 2);
  await writeFile(BUNDLED_OUTPUT_PATH, contents, 'utf-8');
  await writeFile(PUBLIC_OUTPUT_PATH, contents, 'utf-8');
  const version = Date.now().toString(36);
  await writeFile(
    CACHE_VERSION_PATH,
    `export const OPENINGS_CACHE_VERSION = '${version}';\n`,
    'utf-8',
  );
  console.log(
    `Wrote ${openings.length} openings to ${BUNDLED_OUTPUT_PATH} and ${PUBLIC_OUTPUT_PATH} with cache version ${version}`,
  );
}

buildOpenings().catch((err) => {
  console.error(err);
  process.exit(1);
});
