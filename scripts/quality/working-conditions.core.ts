import { requireAt } from './require-at.core';

export const WORKING_CONDITION_AREAS: readonly string[] = ['Build', 'Observe', 'Ship'];

export interface Wall {
  readonly id: string;
  readonly area: string;
  readonly description: string;
  readonly terms: readonly string[];
}

export interface FrictionLine {
  readonly task: string;
  readonly writer: string;
  readonly text: string;
}

export interface FiledWall {
  readonly wall: Wall;
  readonly lines: readonly FrictionLine[];
  readonly agents: number;
  readonly tasks: number;
}

export interface FrictionBoard {
  readonly walls: readonly FiledWall[];
  readonly unfiled: readonly FrictionLine[];
}

const WALL_LINE_PATTERN = /^- `([a-z0-9-]+)` · ([A-Za-z]+) · (.+)$/;
const MATCH_LINE_PATTERN = /^\s+match:\s*(.*)$/;
const TERM_SEPARATOR = /\s*\|\s*/;
const KAIZEN_LINE_PATTERN = /^- \[[0-9:]+\] `([^`]+)` (.+)$/;
const TABLE_ROW_PATTERN = /^\|(.+)\|\s*$/;
const NUMBERED_CELL_PATTERN = /^\d+$/;
const HOOK_WRITER_PREFIX = 'hook:';
const HOOK_AREA = 'Build';
const INVENTORY_WRITER = 'inventory';
const FRICTION_HEADER = 'friction';
const WRITER_HEADER = 'writer';
const BACKTICKS_PATTERN = /`/g;

function readTerms(line: string): readonly string[] {
  return line
    .split(TERM_SEPARATOR)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);
}

export function readWalls(markdown: string): readonly Wall[] {
  const walls: Wall[] = [];
  for (const line of markdown.split('\n')) {
    const wall = WALL_LINE_PATTERN.exec(line);
    const match = MATCH_LINE_PATTERN.exec(line);
    if (wall !== null) {
      walls.push({
        id: requireAt(wall, 1),
        area: requireAt(wall, 2),
        description: requireAt(wall, 3).trim(),
        terms: [],
      });
    }
    const last = walls.at(-1);
    if (match !== null && last !== undefined) {
      walls.splice(-1, 1, { ...last, terms: readTerms(requireAt(match, 1)) });
    }
  }
  return walls;
}

export function readKaizenLines(task: string, markdown: string): readonly FrictionLine[] {
  const found: FrictionLine[] = [];
  for (const line of markdown.split('\n')) {
    const entry = KAIZEN_LINE_PATTERN.exec(line);
    if (entry !== null)
      found.push({ task, writer: requireAt(entry, 1), text: requireAt(entry, 2).trim() });
  }
  return found;
}

function splitRow(line: string): readonly string[] | null {
  const row = TABLE_ROW_PATTERN.exec(line);
  return row === null
    ? null
    : requireAt(row, 1)
        .split('|')
        .map((cell) => cell.trim());
}

export function readInventoryLines(task: string, markdown: string): readonly FrictionLine[] {
  const found: FrictionLine[] = [];
  let headers: readonly string[] | null = null;
  for (const line of markdown.split('\n')) {
    const cells = splitRow(line);
    if (cells === null) continue;
    const lowerCells = cells.map((cell) => cell.toLowerCase());
    if (lowerCells.includes(FRICTION_HEADER)) {
      headers = lowerCells;
      continue;
    }
    if (headers === null || !NUMBERED_CELL_PATTERN.test(requireAt(cells, 0))) continue;
    const frictionColumn = headers.indexOf(FRICTION_HEADER);
    const writerColumn = headers.indexOf(WRITER_HEADER);
    const writer =
      writerColumn < 0
        ? INVENTORY_WRITER
        : (cells[writerColumn] ?? '').replace(BACKTICKS_PATTERN, '');
    found.push({ task, writer, text: cells[frictionColumn] ?? '' });
  }
  return found;
}

export function selectWallProblems(
  walls: readonly Wall[],
  board: FrictionBoard,
): readonly string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const wall of walls) {
    if (seen.has(wall.id)) problems.push(`wall ${wall.id} is declared twice`);
    seen.add(wall.id);
    if (!WORKING_CONDITION_AREAS.includes(wall.area)) {
      problems.push(
        `wall ${wall.id} is filed under ${wall.area}, not ${WORKING_CONDITION_AREAS.join(', ')}`,
      );
    }
    if (wall.terms.length === 0) problems.push(`wall ${wall.id} has no match: terms`);
    const filed = board.walls.find((entry) => entry.wall.id === wall.id);
    if (filed === undefined && wall.terms.length > 0) {
      problems.push(`wall ${wall.id} files no friction line; fix its terms or remove it`);
    }
  }
  return problems;
}

function countDistinct(
  lines: readonly FrictionLine[],
  key: (line: FrictionLine) => string,
): number {
  return new Set(lines.map(key)).size;
}

function selectWall(line: FrictionLine, walls: readonly Wall[]): Wall | null {
  const text = `${line.writer} ${line.text}`.toLowerCase();
  const declared = walls.find((wall) => wall.terms.some((term) => text.includes(term)));
  if (declared !== undefined) return declared;
  if (!line.writer.startsWith(HOOK_WRITER_PREFIX)) return null;
  return {
    id: line.writer,
    area: HOOK_AREA,
    description: 'A guard hook refused a command',
    terms: [],
  };
}

export function fileFriction(
  lines: readonly FrictionLine[],
  walls: readonly Wall[],
): FrictionBoard {
  const linesByWall = new Map<string, { wall: Wall; lines: FrictionLine[] }>();
  const unfiled: FrictionLine[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const identity = `${line.task}\n${line.writer}\n${line.text}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const wall = selectWall(line, walls);
    if (wall === null) {
      unfiled.push(line);
      continue;
    }
    const filed = linesByWall.get(wall.id) ?? { wall, lines: [] };
    filed.lines.push(line);
    linesByWall.set(wall.id, filed);
  }
  const filedWalls = [...linesByWall.values()]
    .map(({ wall, lines: wallLines }) => ({
      wall,
      lines: wallLines,
      agents: countDistinct(wallLines, (line) => `${line.task}/${line.writer}`),
      tasks: countDistinct(wallLines, (line) => line.task),
    }))
    .sort(
      (first, second) =>
        second.agents - first.agents ||
        second.tasks - first.tasks ||
        first.wall.id.localeCompare(second.wall.id),
    );
  return { walls: filedWalls, unfiled };
}
