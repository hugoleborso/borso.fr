import { buildDecksDocument } from '../../../scripts/decks/deck-build.core';
import {
  buildExampleFolder,
  buildExampleInput,
} from '../../../scripts/decks/deck-build.test-utils';
import type { BuiltDeck, DecksDocument } from './deck.utils';

export function buildExampleDocument(): DecksDocument {
  const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
  if (!build.ok) throw new Error(build.problems.join('\n'));
  return build.document;
}

export function buildExampleDeck(): BuiltDeck {
  const [deck] = buildExampleDocument().decks;
  if (deck === undefined) throw new Error('the example holds one deck');
  return deck;
}
