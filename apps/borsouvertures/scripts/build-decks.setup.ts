import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildDecksDocument } from './decks/deck-build.core';
import { DECK_CONTENT_ROOTS, readDeckBuildInput } from './decks/deck-folders.adapter';

const OUTPUT_PATH = path.resolve('site/public/decks.json');

const build = buildDecksDocument(readDeckBuildInput(DECK_CONTENT_ROOTS));
if (!build.ok) {
  console.error(build.problems.join('\n'));
  throw new Error(`build-decks found ${build.problems.length} problems in content/decks`);
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(build.document)}\n`);
for (const deck of build.document.decks) {
  console.log(`[build-decks] ${deck.id}: ${deck.lines.length} lines, ${deck.cards.length} cards`);
}
