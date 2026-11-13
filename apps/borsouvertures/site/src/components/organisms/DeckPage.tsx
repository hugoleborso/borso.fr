import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { Notice } from '@/components/atoms/Notice';
import { Panel } from '@/components/atoms/Panel';
import { DeckLineDetails } from '@/components/molecules/DeckLineDetails';
import { findDeck, listLineSteps } from '@/decks/card.core';
import { selectDeckName } from '@/decks/idea.utils';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { openScreen } from '@/navigation/navigation.store';
import { findDeckProgress } from '@/review/daily-plan.core';
import { useTrainerProgress } from '@/review/trainer-progress.hook';
import type { Side } from '@/state/persistedState.utils';
import type { AppScreenProps } from './screen.types';

const SIDE_KEY_BY_SIDE = {
  white: 'decks.side.white',
  black: 'decks.side.black',
} as const satisfies Record<Side, string>;

// @FollowsBlueprint component-lookup-table
const NOTHING_TO_REVIEW_BY_EMPTY_SESSION: ComponentByFlag<{ message: string }> = {
  true: Notice,
  false: EmptySlot,
};

// @FollowsBlueprint organism-presentational
export function DeckPage({ decks, deckId }: AppScreenProps) {
  const { t, i18n } = useTranslation();
  const progress = useTrainerProgress(decks);
  const deck = deckId === null ? null : findDeck(decks, deckId);
  const deckProgress = deck === null ? null : findDeckProgress(progress, deck.id);
  if (deck === null || deckProgress === null) return null;
  const isSessionEmpty = deckProgress.sessionCardIds.length === 0;
  const NothingToReview = NOTHING_TO_REVIEW_BY_EMPTY_SESSION[`${isSessionEmpty}`];
  const name = selectDeckName(
    i18n.getResource(i18n.language, 'translation', deck.nameKey),
    deck.nameKey,
  );
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <div>
        <Button label={t('decks.back')} onActivate={() => openScreen({ kind: 'decks' })} />
      </div>
      <Panel title={name}>
        <p>{t(SIDE_KEY_BY_SIDE[deck.side])}</p>
        <p>
          {t('decks.counts', {
            cards: deckProgress.cardCount,
            due: deckProgress.dueCount,
            new: deckProgress.newCount,
          })}
        </p>
        <Button
          label={t('decks.review')}
          variant="primary"
          isDisabled={isSessionEmpty}
          onActivate={() => openScreen({ kind: 'review-session', deckId: deck.id })}
        />
        <NothingToReview message={t('decks.nothing-to-review')} />
      </Panel>
      <Panel title={t('decks.lines')}>
        {deck.lines.map((line) => (
          <DeckLineDetails key={line.name} line={line} steps={listLineSteps(deck, line)} />
        ))}
      </Panel>
    </div>
  );
}
