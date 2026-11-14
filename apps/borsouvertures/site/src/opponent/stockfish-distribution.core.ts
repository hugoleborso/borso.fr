export type StockfishFileRole = 'worker' | 'wasm' | 'licence';

interface StockfishFile {
  fileName: string;
  byteSize: number;
  sha256: string;
}

// @FollowsBlueprint core-lookup-table
export const STOCKFISH_DISTRIBUTION = {
  version: '19.0.1',
  licence: 'GPL-3.0',
  publicFolder: 'stockfish',
  upstreamTag: 'v19.0.1',
  sourceUrl: 'https://github.com/nmrugg/stockfish.js/tree/v19.0.1',
  files: {
    worker: {
      fileName: 'stockfish-19-lite-single.js',
      byteSize: 28_230,
      sha256: 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a',
    },
    wasm: {
      fileName: 'stockfish-19-lite-single.wasm',
      byteSize: 1_845_971,
      sha256: 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de',
    },
    licence: {
      fileName: 'Copying.txt',
      byteSize: 35_821,
      sha256: '0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b',
    },
  },
} as const satisfies {
  version: string;
  licence: string;
  publicFolder: string;
  upstreamTag: string;
  sourceUrl: string;
  files: Record<StockfishFileRole, StockfishFile>;
};

const STOCKFISH_FILE_ROLES: readonly StockfishFileRole[] = ['worker', 'wasm', 'licence'];

export function listStockfishFiles(): StockfishFile[] {
  return STOCKFISH_FILE_ROLES.map((role) => STOCKFISH_DISTRIBUTION.files[role]);
}

export function listTamperedFiles(actualDigests: Readonly<Record<string, string>>): string[] {
  return listStockfishFiles()
    .filter((file) => actualDigests[file.fileName] !== file.sha256)
    .map((file) => file.fileName);
}
