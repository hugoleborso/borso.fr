import { type CSSProperties, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { BoardView } from '@/components/atoms/BoardView';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { IconButton } from '@/components/molecules/IconButton';
import { IdeaPanel } from '@/components/molecules/IdeaPanel';
import type { CardBodyProps } from '@/components/molecules/card-body.types';
import { MoveCardBody } from '@/components/molecules/MoveCardBody';
import { NameCardBody } from '@/components/molecules/NameCardBody';
import { ProgressNotKeptBanner } from '@/components/molecules/ProgressNotKeptBanner';
import { ReviewSummary } from '@/components/molecules/ReviewSummary';
import { selectReviewMark } from '@/components/molecules/review-mark.core';
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
  const status = selectReviewStatus(snapshot);
  const answerMoves = listAnswerMoves(snapshot);
  const deckName = selectDeckName(
    i18n.getResource(i18n.language, 'translation', reviewCard.deckNameKey),
    reviewCard.deckNameKey,
  );
  return (
    <div className="flex flex-col gap-3 w-full max-w-xl mx-auto lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:max-w-none lg:gap-x-8 lg:items-start">
      <div className="flex items-center justify-between gap-3 lg:col-span-2">
        <h2 className="min-w-0 text-base font-bold leading-tight tabular-nums">
          {t('review.progress', {
            deck: deckName,
            position: selectSessionPosition(snapshot),
            total: snapshot.cardCount,
          })}
        </h2>
        <IconButton label={t('review.leave')} icon="close" onActivate={onLeave} />
      </div>
      <BoardView
        orientation={reviewCard.readerSide}
        fen={snapshot.fen}
        onMove={(uci) => isMoveAccepted(reviewMachine.playMove(uci))}
        mover={reviewCard.readerSide}
        arrows={answerMoves.map((uci) => uciToArrow(uci))}
        highlightSquares={NO_HIGHLIGHTS}
        boardStyleId={boardStyle}
        boardWidth={boardWidth}
        mark={selectReviewMark(status, answerMoves, reviewCard.readerSide)}
      />
      <div className="flex flex-col gap-3 w-full">
        <CardBody reviewCard={reviewCard} status={status} onChooseName={reviewMachine.chooseName} />
        <div className="empty:hidden lg:order-last">
          <IdeaSlot idea={reviewCard.idea} />
        </div>
        <ActionBar>
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
        </ActionBar>
      </div>
    </div>
  );
}

/**
 * @Blueprint organism-machine-bound
 * @BlueprintName Organism Bound To A State Machine
 * @BlueprintUsage Use for a screen region whose state lives in a hand written machine outside React.
 * @BlueprintDescription Starts the machine once from `useSessionStart`, then reads it through `useSyncExternalStore` with the machine's own `subscribe` and `getSnapshot` passed as stable references rather than inline closures. Everything the markup needs is derived from that snapshot during render through pure selectors, and the two modal flags are read as lookup keys, so the component holds no `useState` mirroring the machine and no effect keeping the two in step.
 */
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
    <div className="flex flex-col gap-3 w-full">
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
