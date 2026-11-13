import { reportTaggedError } from '@/observability/error-reporting.adapter';
import { type DecksLoad, selectDecksLoad } from './decks-load.utils';
import { fetchDecksDocument } from './decks-source.adapter';

const DECKS_URL = '/decks.json';

const decksRequest: { pending: Promise<DecksLoad> | undefined } = { pending: undefined };

async function loadDecks(): Promise<DecksLoad> {
  const load = selectDecksLoad(await fetchDecksDocument(DECKS_URL));
  if (load.failure !== null) reportTaggedError(load.failure, { deckId: load.failure.deckId });
  return load;
}

// @FollowsBlueprint route-suspense-resource
export function readDecksRequest(): Promise<DecksLoad> {
  decksRequest.pending ??= loadDecks();
  return decksRequest.pending;
}
