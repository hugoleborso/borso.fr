import type { BuiltDeck } from '@/decks/deck.utils';

export interface AppScreenProps {
  decks: BuiltDeck[];
  deckId: string | null;
}
