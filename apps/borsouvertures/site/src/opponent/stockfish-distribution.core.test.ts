/**
 * @vitest-environment node
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listStockfishFiles,
  listTamperedFiles,
  STOCKFISH_DISTRIBUTION,
} from './stockfish-distribution.core';

const ENGINE_FOLDER = path.resolve('site/public', STOCKFISH_DISTRIBUTION.publicFolder);

function digestCommittedFile(fileName: string): string {
  return createHash('sha256')
    .update(readFileSync(path.join(ENGINE_FOLDER, fileName)))
    .digest('hex');
}

// @FollowsBlueprint test-pure-unit
describe('the vendored Stockfish files', () => {
  it('are the three files of stockfish 19.0.1, under GPL-3.0, with the upstream tag', () => {
    expect(STOCKFISH_DISTRIBUTION).toMatchObject({
      version: '19.0.1',
      licence: 'GPL-3.0',
      publicFolder: 'stockfish',
      upstreamTag: 'v19.0.1',
      sourceUrl: 'https://github.com/nmrugg/stockfish.js/tree/v19.0.1',
    });
    expect(listStockfishFiles().map((file) => file.fileName)).toEqual([
      'stockfish-19-lite-single.js',
      'stockfish-19-lite-single.wasm',
      'Copying.txt',
    ]);
  });

  it('are committed unmodified: each has the pinned size and SHA-256', () => {
    for (const file of listStockfishFiles()) {
      expect(statSync(path.join(ENGINE_FOLDER, file.fileName)).size).toBe(file.byteSize);
      expect(digestCommittedFile(file.fileName)).toBe(file.sha256);
    }
    expect(listStockfishFiles().map((file) => file.byteSize)).toEqual([28_230, 1_845_971, 35_821]);
  });
});

describe('listTamperedFiles', () => {
  const committed = Object.fromEntries(
    listStockfishFiles().map((file) => [file.fileName, file.sha256]),
  );

  it('names nothing when every digest matches', () => {
    expect(listTamperedFiles(committed)).toEqual([]);
  });

  it('names a file whose digest differs and a file that is missing', () => {
    expect(
      listTamperedFiles({ ...committed, 'stockfish-19-lite-single.wasm': 'another digest' }),
    ).toEqual(['stockfish-19-lite-single.wasm']);
    expect(listTamperedFiles({})).toEqual([
      'stockfish-19-lite-single.js',
      'stockfish-19-lite-single.wasm',
      'Copying.txt',
    ]);
  });
});
