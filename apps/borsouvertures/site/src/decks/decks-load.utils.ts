import { type BuiltDeck, DeckContentInvalidError, parseDecksDocument } from './deck.utils';

export type DecksDocumentFetch =
  | { readonly status: 'unreachable' }
  | { readonly status: 'refused'; readonly httpStatus: number }
  | { readonly status: 'arrived'; readonly body: unknown };

export class DecksDocumentRefusedError extends Error {
  readonly tags: { status: string; route: string };

  constructor(httpStatus: number) {
    super(`The site answered ${String(httpStatus)} for the built decks.`);
    this.name = 'DecksDocumentRefusedError';
    this.tags = { status: String(httpStatus), route: 'GET /decks.json' };
  }
}

export type DecksLoad =
  | { status: 'loaded'; decks: BuiltDeck[]; failure: null }
  | { status: 'unreachable'; decks: BuiltDeck[]; failure: null }
  | {
      status: 'failed';
      decks: BuiltDeck[];
      failure: DeckContentInvalidError | DecksDocumentRefusedError;
      tags: Readonly<Record<string, string>>;
    };

const UNREACHABLE: DecksLoad = { status: 'unreachable', decks: [], failure: null };

// @FollowsBlueprint utils-pure-module
export function selectDecksLoad(fetched: DecksDocumentFetch): DecksLoad {
  if (fetched.status === 'unreachable') return UNREACHABLE;
  if (fetched.status === 'refused') {
    const failure = new DecksDocumentRefusedError(fetched.httpStatus);
    return { status: 'failed', decks: [], failure, tags: failure.tags };
  }
  try {
    return { status: 'loaded', decks: parseDecksDocument(fetched.body).decks, failure: null };
  } catch (error) {
    if (!(error instanceof DeckContentInvalidError)) throw error;
    return { status: 'failed', decks: [], failure: error, tags: { deckId: error.deckId } };
  }
}
