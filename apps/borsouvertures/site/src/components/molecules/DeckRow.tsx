import { useTranslation } from 'react-i18next';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { SelectorCard } from '@/components/atoms/SelectorCard';
import type { BuiltDeck } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import { buildDeckPreviewFen } from '@/openings/previews.utils';
import type { DeckProgress } from '@/review/daily-plan.core';
import type { DeckShare, RecallShareKind } from '@/review/retention.core';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const SIDE_KEY_BY_SIDE = {
  white: 'review.side.white',
  black: 'review.side.black',
} as const satisfies Record<Side, string>;

const RETENTION_KEY_BY_KIND = {
  measured: 'decks.retention.measured',
  empty: 'decks.retention.empty',
} as const satisfies Record<RecallShareKind, string>;

interface DeckRowProps {
  deck: BuiltDeck;
  progress: DeckProgress;
  retention: DeckShare;
  boardStyle: BoardThemeId;
  onOpen: (deckId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function DeckRow({ deck, progress, retention, boardStyle, onOpen }: DeckRowProps) {
  const { t, i18n } = useTranslation();
  const name = selectDeckName(
    i18n.getResource(i18n.language, 'translation', deck.nameKey),
    deck.nameKey,
  );
  return (
    <SelectorCard
      label={name}
      meta={t('decks.row-counts', {
        side: t(SIDE_KEY_BY_SIDE[deck.side]),
        cards: progress.cardCount,
        due: progress.dueCount,
        new: progress.newCount,
      })}
      detail={t(RETENTION_KEY_BY_KIND[retention.kind], { percent: retention.percent })}
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
