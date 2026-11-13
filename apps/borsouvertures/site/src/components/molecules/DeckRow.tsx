import { useTranslation } from 'react-i18next';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { SelectorCard } from '@/components/atoms/SelectorCard';
import type { BuiltDeck } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import { buildDeckPreviewFen } from '@/openings/previews.utils';
import type { DeckProgress } from '@/review/daily-plan.core';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface DeckRowProps {
  deck: BuiltDeck;
  progress: DeckProgress;
  boardStyle: BoardThemeId;
  onOpen: (deckId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function DeckRow({ deck, progress, boardStyle, onOpen }: DeckRowProps) {
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
      board={
        <MiniBoard
          fen={buildDeckPreviewFen(deck.lines)}
          boardStyleId={boardStyle}
          orientation={deck.side}
        />
      }
      isActive={false}
      onSelect={() => onOpen(deck.id)}
    />
  );
}
