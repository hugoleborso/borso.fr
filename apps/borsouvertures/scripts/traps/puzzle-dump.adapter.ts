import { zstdDecompressSync } from 'node:zlib';

export const PUZZLE_DUMP_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';

export type PuzzleDumpFailure = 'not-served' | 'no-date' | 'unknown-format' | 'truncated';

export class PuzzleDumpUnavailableError extends Error {
  readonly failure: PuzzleDumpFailure;

  constructor(failure: PuzzleDumpFailure) {
    super(`The Lichess puzzle dump cannot be read (${failure}).`);
    this.name = 'PuzzleDumpUnavailableError';
    this.failure = failure;
  }
}

export interface PuzzleDump {
  lastModified: string;
  lines: Generator<string>;
}

export interface PuzzleDumpOptions {
  fetchDump: (url: string) => Promise<Response>;
}

const SKIPPABLE_FRAME_MAGIC_PREFIX = 0x1_84_d2_a5;
const MAGIC_VARIANT_BITS = 4;
const FRAME_SIZE_FIELD_BYTES = 4;
const SIZE_OFFSET = 4;
const NEXT_FRAME_SIZE_OFFSET = 8;
const SKIPPABLE_FRAME_BYTES = 12;
const DATE_LENGTH = 10;
const LINE_FEED = 0x0a;

function isSizeAnnouncement(dump: Buffer, offset: number): boolean {
  return (
    dump.readUInt32LE(offset) >>> MAGIC_VARIANT_BITS === SKIPPABLE_FRAME_MAGIC_PREFIX &&
    dump.readUInt32LE(offset + SIZE_OFFSET) === FRAME_SIZE_FIELD_BYTES
  );
}

function* readFrames(dump: Buffer): Generator<Buffer> {
  let offset = 0;
  while (offset < dump.length) {
    const frameStart = offset + SKIPPABLE_FRAME_BYTES;
    if (frameStart > dump.length) throw new PuzzleDumpUnavailableError('truncated');
    if (!isSizeAnnouncement(dump, offset)) throw new PuzzleDumpUnavailableError('unknown-format');
    const frameEnd = frameStart + dump.readUInt32LE(offset + NEXT_FRAME_SIZE_OFFSET);
    if (frameEnd > dump.length) throw new PuzzleDumpUnavailableError('truncated');
    yield zstdDecompressSync(dump.subarray(frameStart, frameEnd));
    offset = frameEnd;
  }
}

function* readLines(dump: Buffer): Generator<string> {
  let unfinishedLine = Buffer.alloc(0);
  for (const frame of readFrames(dump)) {
    const text = Buffer.concat([unfinishedLine, frame]);
    let lineStart = 0;
    for (
      let lineEnd = text.indexOf(LINE_FEED);
      lineEnd !== -1;
      lineEnd = text.indexOf(LINE_FEED, lineStart)
    ) {
      yield text.toString('utf8', lineStart, lineEnd);
      lineStart = lineEnd + 1;
    }
    unfinishedLine = text.subarray(lineStart);
  }
  if (unfinishedLine.length > 0) yield unfinishedLine.toString('utf8');
}

function readLastModifiedDay(response: Response): string {
  const lastModified = new Date(String(response.headers.get('last-modified')));
  if (Number.isNaN(lastModified.getTime())) throw new PuzzleDumpUnavailableError('no-date');
  return lastModified.toISOString().slice(0, DATE_LENGTH);
}

// @FollowsBlueprint adapter-external-service
export async function openPuzzleDump(
  options: PuzzleDumpOptions = { fetchDump: (url) => fetch(url) },
): Promise<PuzzleDump> {
  const response = await options.fetchDump(PUZZLE_DUMP_URL);
  if (!response.ok) throw new PuzzleDumpUnavailableError('not-served');
  const lastModified = readLastModifiedDay(response);
  const dump = Buffer.from(await response.arrayBuffer());
  return { lastModified, lines: readLines(dump) };
}
