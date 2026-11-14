import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  listStockfishFiles,
  listTamperedFiles,
  STOCKFISH_DISTRIBUTION,
} from '../site/src/opponent/stockfish-distribution.core';
import { buildDecksDocument } from './decks/deck-build.core';
import { DECK_CONTENT_ROOTS, readDeckBuildInput } from './decks/deck-folders.adapter';
import {
  buildGateFinding,
  formatGateReport,
  type GateFinding,
  isForcedSearchNeeded,
  isGatePassed,
  listMovesToCheck,
  SEARCH_DEPTH,
} from './decks/engine-gate.core';
import { startStockfishProcess } from './decks/stockfish-process.adapter';

const ENGINE_FOLDER = path.resolve('site/public', STOCKFISH_DISTRIBUTION.publicFolder);

function digestFile(fileName: string): [string, string] {
  const digest = createHash('sha256').update(readFileSync(path.join(ENGINE_FOLDER, fileName)));
  return [fileName, digest.digest('hex')];
}

function copyEngineOutsideTheModulePackage(): string {
  const folder = mkdtempSync(path.join(tmpdir(), 'borsouvertures-stockfish-'));
  for (const file of [STOCKFISH_DISTRIBUTION.files.worker, STOCKFISH_DISTRIBUTION.files.wasm]) {
    copyFileSync(path.join(ENGINE_FOLDER, file.fileName), path.join(folder, file.fileName));
  }
  return path.join(folder, STOCKFISH_DISTRIBUTION.files.worker.fileName);
}

const tampered = listTamperedFiles(
  Object.fromEntries(listStockfishFiles().map((file) => digestFile(file.fileName))),
);
if (tampered.length > 0) {
  throw new Error(`check-decks refuses a modified engine file: ${tampered.join(', ')}`);
}

const build = buildDecksDocument(readDeckBuildInput(DECK_CONTENT_ROOTS));
if (!build.ok) {
  console.error(build.problems.join('\n'));
  throw new Error('check-decks needs decks that build, run build:decks first');
}

const stockfish = await startStockfishProcess({
  enginePath: copyEngineOutsideTheModulePackage(),
  spawnEngine: (enginePath) => spawn(process.execPath, [enginePath]),
});

const findings: GateFinding[] = [];
for (const move of listMovesToCheck(build.readerMoves, process.env.DECK ?? null)) {
  const free = await stockfish.searchPosition(move.fen, SEARCH_DEPTH, null);
  const isForcedNeeded = isForcedSearchNeeded(free, move.moveUci);
  const forced = isForcedNeeded
    ? await stockfish.searchPosition(move.fen, SEARCH_DEPTH, move.moveUci)
    : null;
  findings.push(buildGateFinding(move, free, forced));
}
stockfish.stop();

console.log(formatGateReport(findings).join('\n'));
const isPassed = isGatePassed(findings);
if (!isPassed) throw new Error('check-decks failed, see the moves above');
