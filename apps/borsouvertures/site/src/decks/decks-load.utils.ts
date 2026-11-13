import { type BuiltDeck, DeckContentInvalidError, parseDecksDocument } from './deck.utils';

export type DecksDocumentFetch =
  | { readonly status: 'unreachable' }
  | { readonly status: 'arrived'; readonly body: unknown };

export type DecksLoad =
  | { status: 'loaded'; decks: BuiltDeck[]; failure: null }
  | { status: 'unreachable'; decks: BuiltDeck[]; failure: null }
  | { status: 'failed'; decks: BuiltDeck[]; failure: DeckContentInvalidError };

const UNREACHABLE: DecksLoad = { status: 'unreachable', decks: [], failure: null };

// @FollowsBlueprint utils-pure-module
export function selectDecksLoad(fetched: DecksDocumentFetch): DecksLoad {
  if (fetched.status === 'unreachable') return UNREACHABLE;
  try {
    return { status: 'loaded', decks: parseDecksDocument(fetched.body).decks, failure: null };
  } catch (error) {
    if (!(error instanceof DeckContentInvalidError)) throw error;
    return { status: 'failed', decks: [], failure: error };
  }
}
