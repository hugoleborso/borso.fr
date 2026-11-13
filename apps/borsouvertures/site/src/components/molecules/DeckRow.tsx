import { useTranslation } from 'react-i18next';
import { SelectorCard } from '@/components/atoms/SelectorCard';
import type { BuiltDeck } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import type { DeckProgress } from '@/review/daily-plan.core';

interface DeckRowProps {
  deck: BuiltDeck;
  progress: DeckProgress;
  onOpen: (deckId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function DeckRow({ deck, progress, onOpen }: DeckRowProps) {
  const { t, i18n } = useTranslation();
  const name = selectDeckName(
    i18n.getResource(i18n.language, 'translation', deck.nameKey),
    deck.nameKey,
  );
  return (
    <SelectorCard
      label={name}
      meta={t('decks.counts', {
        cards: progress.cardCount,
        due: progress.dueCount,
        new: progress.newCount,
      })}
      isActive={false}
      onSelect={() => onOpen(deck.id)}
    />
  );
}
