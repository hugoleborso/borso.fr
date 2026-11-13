import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/atoms/Panel';
import { DeckRow } from '@/components/molecules/DeckRow';
import { NewCardsPerDaySelect } from '@/components/molecules/NewCardsPerDaySelect';
import { openScreen } from '@/navigation/navigation.store';
import { recordProductEvent } from '@/observability/error-reporting.adapter';
import { useTrainerProgress } from '@/review/trainer-progress.hook';
import { useAppState } from '@/state/appState';
import type { AppScreenProps } from './screen.types';

function openDeck(deckId: string): void {
  recordProductEvent({ name: 'deck_opened', deckId });
  openScreen({ kind: 'deck', deckId });
}

// @FollowsBlueprint organism-presentational
export function DecksScreen({ decks }: AppScreenProps) {
  const { t } = useTranslation();
  const progress = useTrainerProgress(decks);
  const { newCardsPerDay } = useAppState();
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <Panel title={t('decks.title')}>
        {decks.map((deck, index) => {
          const deckProgress = progress.deckProgress[index];
          if (deckProgress === undefined) return null;
          return <DeckRow key={deck.id} deck={deck} progress={deckProgress} onOpen={openDeck} />;
        })}
        <NewCardsPerDaySelect newCardsPerDay={newCardsPerDay} />
      </Panel>
    </div>
  );
}
