import { type CSSProperties, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { BoardView } from '@/components/atoms/BoardView';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { IdeaPanel } from '@/components/molecules/IdeaPanel';
import type { CardBodyProps } from '@/components/molecules/card-body.types';
import { MoveCardBody } from '@/components/molecules/MoveCardBody';
import { NameCardBody } from '@/components/molecules/NameCardBody';
import { ProgressNotKeptBanner } from '@/components/molecules/ProgressNotKeptBanner';
import { ReviewSummary } from '@/components/molecules/ReviewSummary';
import { TrapCardBody } from '@/components/molecules/TrapCardBody';
import { type Card, listReviewCards, type ReviewCard } from '@/decks/card.core';
import type { Idea } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { useSessionStart } from '@/lib/session-start.hook';
import { useBoardWidth } from '@/lib/viewport.hook';
import { selectSessionExitScreen } from '@/navigation/app-screen.core';
import { openScreen } from '@/navigation/navigation.store';
import { uciToArrow } from '@/openings/uciSquare.utils';
import { countNewCards, selectSessionCardIds } from '@/review/daily-plan.core';
import { reviewMachine } from '@/review/review-machine.setup';
import { useReviewLog } from '@/review/review-log.store';
import {
  isIdeaShown,
  isMoveAccepted,
  listAnswerMoves,
  type ReviewSnapshot,
  selectRecalledPercent,
  selectReviewStatus,
  selectSessionPosition,
} from '@/review/review-machine.utils';
import { useTrainerProgress } from '@/review/trainer-progress.hook';
import { useAppState } from '@/state/appState';
import type { AppScreenProps } from './screen.types';

const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};

// @FollowsBlueprint component-lookup-table
const CARD_BODY_BY_KIND: ComponentByKind<Card['kind'], CardBodyProps> = {
  move: MoveCardBody,
  name: NameCardBody,
  trap: TrapCardBody,
};

const SHOW_ANSWER_KEY_BY_KIND = {
  move: 'review.show-move',
  name: 'cards.name.show-answer',
  trap: 'cards.trap.show-answer',
} as const satisfies Record<Card['kind'], string>;

const IDEA_BY_SHOWN: ComponentByFlag<{ idea: Idea | null }> = {
  true: IdeaPanel,
  false: EmptySlot,
};

const BANNER_BY_PROGRESS_KEPT: ComponentByFlag<Record<string, never>> = {
  true: EmptySlot,
  false: ProgressNotKeptBanner,
};

interface AskedCardProps {
  reviewCard: ReviewCard;
  snapshot: ReviewSnapshot;
  onLeave: () => void;
}

function AskedCard({ reviewCard, snapshot, onLeave }: AskedCardProps) {
  const { t, i18n } = useTranslation();
  const { boardStyle } = useAppState();
  const boardWidth = useBoardWidth();
  const isAnswered = snapshot.phase === 'answered';
  const CardBody = CARD_BODY_BY_KIND[reviewCard.card.kind];
  const IdeaSlot = IDEA_BY_SHOWN[`${isIdeaShown(snapshot)}`];
  const deckName = selectDeckName(
    i18n.getResource(i18n.language, 'translation', reviewCard.deckNameKey),
    reviewCard.deckNameKey,
  );
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xl mx-auto">
      <h2 className="self-start text-base font-bold">
        {t('review.progress', {
          deck: deckName,
          position: selectSessionPosition(snapshot),
          total: snapshot.cardCount,
        })}
      </h2>
      <BoardView
        orientation={reviewCard.readerSide}
        fen={snapshot.fen}
        onMove={(uci) => isMoveAccepted(reviewMachine.playMove(uci))}
        arrows={listAnswerMoves(snapshot).map((uci) => uciToArrow(uci))}
        highlightSquares={NO_HIGHLIGHTS}
        boardStyleId={boardStyle}
        boardWidth={boardWidth}
      />
      <div className="flex flex-col gap-3 w-full">
        <CardBody
          reviewCard={reviewCard}
          status={selectReviewStatus(snapshot)}
          onChooseName={reviewMachine.chooseName}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            label={t(SHOW_ANSWER_KEY_BY_KIND[reviewCard.card.kind])}
            isDisabled={isAnswered}
            onActivate={reviewMachine.showMove}
          />
          <Button
            label={t('review.next')}
            variant="primary"
            isDisabled={!isAnswered}
            onActivate={reviewMachine.advance}
          />
          <Button label={t('review.leave')} onActivate={onLeave} />
        </div>
        <IdeaSlot idea={reviewCard.idea} />
      </div>
    </div>
  );
}

// @FollowsBlueprint organism-machine-bound
export function ReviewSession({ decks, deckId }: AppScreenProps) {
  const progress = useTrainerProgress(decks);
  const { isProgressKept } = useReviewLog();
  useSessionStart(() => {
    const cardIds = selectSessionCardIds(progress, deckId);
    reviewMachine.start({
      cards: listReviewCards(decks, cardIds),
      newCardCount: countNewCards(progress.plan, cardIds),
    });
  });
  const snapshot = useSyncExternalStore(reviewMachine.subscribe, reviewMachine.getSnapshot);
  const Banner = BANNER_BY_PROGRESS_KEPT[`${isProgressKept}`];

  function leaveSession(): void {
    openScreen(selectSessionExitScreen(deckId));
  }

  const asked = snapshot.current;
  return (
    <div className="flex flex-col gap-3">
      <Banner />
      {asked === null ? (
        <div className="w-full max-w-xl mx-auto">
          <ReviewSummary
            recalledCount={snapshot.recalledCount}
            answeredCount={snapshot.answeredCount}
            recalledPercent={selectRecalledPercent(snapshot)}
            dueTomorrowCount={progress.dueTomorrowCount}
            onLeave={leaveSession}
          />
        </div>
      ) : (
        <AskedCard reviewCard={asked} snapshot={snapshot} onLeave={leaveSession} />
      )}
    </div>
  );
}
