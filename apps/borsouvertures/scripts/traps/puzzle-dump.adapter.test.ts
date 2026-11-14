/**
 * @vitest-environment node
 */

import { zstdCompressSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  openPuzzleDump,
  PUZZLE_DUMP_URL,
  PuzzleDumpUnavailableError,
  type PuzzleDumpFailure,
} from './puzzle-dump.adapter';

const LAST_MODIFIED = 'Sun, 01 Nov 2026 07:57:40 GMT';
const SKIPPABLE_FRAME_MAGIC = 0x18_4d_2a_50;

function buildSizeAnnouncement(
  frameSize: number,
  magic = SKIPPABLE_FRAME_MAGIC,
  sizeField = 4,
): Buffer {
  const header = Buffer.alloc(12);
  header.writeUInt32LE(magic, 0);
  header.writeUInt32LE(sizeField, 4);
  header.writeUInt32LE(frameSize, 8);
  return header;
}

function buildFrame(text: string): Buffer {
  const frame = zstdCompressSync(Buffer.from(text));
  return Buffer.concat([buildSizeAnnouncement(frame.length), frame]);
}

function serve(body: Buffer, headers: Record<string, string> = { 'last-modified': LAST_MODIFIED }) {
  const requests: string[] = [];
  return {
    requests,
    options: {
      fetchDump: async (url: string) => {
        requests.push(url);
        return new Response(new Uint8Array(body), { headers });
      },
    },
  };
}

async function readLines(body: Buffer): Promise<string[]> {
  const dump = await openPuzzleDump(serve(body).options);
  return [...dump.lines];
}

async function readFailure(run: () => Promise<unknown>): Promise<PuzzleDumpFailure | null> {
  try {
    await run();
  } catch (error) {
    if (error instanceof PuzzleDumpUnavailableError) return error.failure;
  }
  return null;
}

// @FollowsBlueprint test-node-adapter
describe('openPuzzleDump', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks Lichess for the dump and gives the day it was last changed', async () => {
    const served = serve(buildFrame('a\n'));
    const dump = await openPuzzleDump(served.options);
    expect(served.requests).toEqual([PUZZLE_DUMP_URL]);
    expect(PUZZLE_DUMP_URL).toBe('https://database.lichess.org/lichess_db_puzzle.csv.zst');
    expect(dump.lastModified).toBe('2026-11-01');
  });

  it('uses the global fetch when no fetcher is given', async () => {
    const served = serve(buildFrame('a\n'));
    vi.stubGlobal('fetch', served.options.fetchDump);
    const dump = await openPuzzleDump();
    expect(served.requests).toEqual([PUZZLE_DUMP_URL]);
    expect([...dump.lines]).toEqual(['a']);
  });

  it('reads the lines across frames, joining a line two frames split', async () => {
    const body = Buffer.concat([
      buildFrame('PuzzleId,FEN\n00008,r6k'),
      buildFrame('/pp2r2p\n'),
      buildFrame('0000D,5rk1\n0009B,r2q'),
    ]);
    expect(await readLines(body)).toEqual([
      'PuzzleId,FEN',
      '00008,r6k/pp2r2p',
      '0000D,5rk1',
      '0009B,r2q',
    ]);
  });

  it('reads accented text that two frames split inside one character', async () => {
    const accented = Buffer.from('é\n');
    const first = zstdCompressSync(accented.subarray(0, 1));
    const second = zstdCompressSync(accented.subarray(1));
    const body = Buffer.concat([
      buildSizeAnnouncement(first.length),
      first,
      buildSizeAnnouncement(second.length),
      second,
    ]);
    expect(await readLines(body)).toEqual(['é']);
  });

  it('reads an empty dump as no line', async () => {
    expect(await readLines(Buffer.alloc(0))).toEqual([]);
  });

  it('refuses a dump Lichess does not serve', async () => {
    const failure = await readFailure(() =>
      openPuzzleDump({ fetchDump: async () => new Response('gone', { status: 404 }) }),
    );
    expect(failure).toBe('not-served');
  });

  it('refuses a dump with no date', async () => {
    expect(await readFailure(() => openPuzzleDump(serve(buildFrame('a\n'), {}).options))).toBe(
      'no-date',
    );
  });

  it.each([
    [
      'a frame without its size announcement',
      zstdCompressSync(Buffer.from('PuzzleId,FEN,Moves\n')),
    ],
    ['an announcement of another kind', buildSizeAnnouncement(1, 0x18_4d_2a_40)],
    [
      'an announcement whose size field is not four bytes',
      buildSizeAnnouncement(1, SKIPPABLE_FRAME_MAGIC, 8),
    ],
  ])('refuses %s', async (_label, body) => {
    expect(await readFailure(() => readLines(Buffer.concat([buildFrame('a\n'), body])))).toBe(
      'unknown-format',
    );
  });

  it('accepts every variant of the size announcement', async () => {
    const frame = zstdCompressSync(Buffer.from('a\n'));
    const body = Buffer.concat([buildSizeAnnouncement(frame.length, 0x18_4d_2a_5f), frame]);
    expect(await readLines(body)).toEqual(['a']);
  });

  it.each([
    ['a cut announcement', buildFrame('a\n').subarray(0, 11)],
    ['a cut frame', buildFrame('a\n').subarray(0, -1)],
  ])('refuses %s as truncated', async (_label, body) => {
    expect(await readFailure(() => readLines(body))).toBe('truncated');
  });

  it('names the failure in the error', () => {
    const error = new PuzzleDumpUnavailableError('truncated');
    expect(error.name).toBe('PuzzleDumpUnavailableError');
    expect(error.message).toBe('The Lichess puzzle dump cannot be read (truncated).');
  });
});
