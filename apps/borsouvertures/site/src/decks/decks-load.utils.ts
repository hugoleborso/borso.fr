import { type BuiltDeck, DeckContentInvalidError, parseDecksDocument } from './deck.utils';

export type DecksLoad =
  | { status: 'loaded'; decks: BuiltDeck[]; failure: null }
  | { status: 'failed'; decks: BuiltDeck[]; failure: DeckContentInvalidError };

// @FollowsBlueprint utils-pure-module
export function selectDecksLoad(body: unknown): DecksLoad {
  try {
    return { status: 'loaded', decks: parseDecksDocument(body).decks, failure: null };
  } catch (error) {
    if (!(error instanceof DeckContentInvalidError)) throw error;
    return { status: 'failed', decks: [], failure: error };
  }
}
