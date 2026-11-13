import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { DECK_CONTENT_ROOTS, readDeckBuildInput } from './decks/deck-folders.adapter';
import { openPuzzleDump } from './traps/puzzle-dump.adapter';
import {
  buildTrapsDocument,
  formatTrapCounts,
  listTrapCandidates,
  listTrapDeckFilters,
  type TrapCandidate,
} from './traps/puzzle-row.core';

const JSON_INDENT_SPACES = 2;

const filters = listTrapDeckFilters(
  readDeckBuildInput(DECK_CONTENT_ROOTS).folders.map((folder) => folder.deck),
);
const dump = await openPuzzleDump();
const candidates: TrapCandidate[] = [];
for (const line of dump.lines) candidates.push(...listTrapCandidates(line, filters));

const document = buildTrapsDocument(dump.lastModified, filters, candidates);
writeFileSync(
  DECK_CONTENT_ROOTS.trapsPath,
  `${JSON.stringify(document, null, JSON_INDENT_SPACES)}\n`,
);
execFileSync('oxfmt', [DECK_CONTENT_ROOTS.trapsPath], { stdio: 'inherit' });
console.log(`[build-traps] dump of ${document.dumpLastModified}`);
console.log(formatTrapCounts(document).join('\n'));
