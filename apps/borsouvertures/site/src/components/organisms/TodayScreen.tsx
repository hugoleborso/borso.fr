import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { Panel } from '@/components/atoms/Panel';
import { DailyCounts } from '@/components/molecules/DailyCounts';
import { DeckRow } from '@/components/molecules/DeckRow';
import { ProgressNotKeptBanner } from '@/components/molecules/ProgressNotKeptBanner';
import type { BuiltDeck } from '@/decks/deck.utils';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { openScreen } from '@/navigation/navigation.store';
import type { TrainerProgress } from '@/review/daily-plan.core';
import { useReviewLog } from '@/review/review-log.store';
import { useTrainerProgress } from '@/review/trainer-progress.hook';
import type { AppScreenProps } from './screen.types';

interface ReviewAheadProps {
  decks: BuiltDeck[];
  progress: TrainerProgress;
}

function openDeck(deckId: string): void {
  openScreen({ kind: 'deck', deckId });
}

function ReviewAheadPanel({ decks, progress }: ReviewAheadProps) {
  const { t } = useTranslation();
  return (
    <Panel title={t('today.review-ahead')}>
      <p>{t('today.nothing-left')}</p>
      {decks.map((deck, index) => {
        const deckProgress = progress.deckProgress[index];
        if (deckProgress === undefined) return null;
        return <DeckRow key={deck.id} deck={deck} progress={deckProgress} onOpen={openDeck} />;
      })}
    </Panel>
  );
}

// @FollowsBlueprint component-lookup-table
const REVIEW_AHEAD_BY_EMPTY_PLAN: ComponentByFlag<ReviewAheadProps> = {
  true: ReviewAheadPanel,
  false: EmptySlot,
};

const BANNER_BY_PROGRESS_KEPT: ComponentByFlag<Record<string, never>> = {
  true: EmptySlot,
  false: ProgressNotKeptBanner,
};

// @FollowsBlueprint organism-presentational
export function TodayScreen({ decks }: AppScreenProps) {
  const { t } = useTranslation();
  const progress = useTrainerProgress(decks);
  const { isProgressKept } = useReviewLog();
  const isPlanEmpty = progress.sessionCardIds.length === 0;
  const ReviewAhead = REVIEW_AHEAD_BY_EMPTY_PLAN[`${isPlanEmpty}`];
  const Banner = BANNER_BY_PROGRESS_KEPT[`${isProgressKept}`];
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <Banner />
      <Panel title={t('today.title')}>
        <DailyCounts
          dueCount={progress.plan.dueCardIds.length}
          newCount={progress.plan.newCardIds.length}
        />
        <Button
          label={t('today.start')}
          variant="primary"
          isDisabled={isPlanEmpty}
          onActivate={() => openScreen({ kind: 'review-session', deckId: null })}
        />
      </Panel>
      <ReviewAhead decks={decks} progress={progress} />
    </div>
  );
}
