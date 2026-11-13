import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Arrow } from 'react-chessboard';
import { ActionBar } from '@/components/atoms/ActionBar';
import { BoardView } from '@/components/atoms/BoardView';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import type { IconName } from '@/components/atoms/Icon';
import { IconButton, type IconButtonVariant } from '@/components/molecules/IconButton';
import { IdeaPanel } from '@/components/molecules/IdeaPanel';
import { LineStepCaption } from '@/components/molecules/LineStepCaption';
import { listLineSteps } from '@/decks/card.core';
import type { BuiltDeck, BuiltDeckLine, Idea } from '@/decks/deck.utils';
import {
  buildLastMoveHighlights,
  isLineStepControlBlocked,
  isReaderStep,
  LINE_START_POSITION,
  type LineStepControl,
  moveLineStepPosition,
  selectLineStep,
  selectLineStepFen,
} from '@/decks/line-stepper.utils';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { useBoardWidth } from '@/lib/viewport.hook';
import { useAppState } from '@/state/appState';
import { getBoardAppearance } from '@/theme/boardAppearance';

const NO_ARROWS: Arrow[] = [];

const STEP_CONTROLS = [
  'first',
  'previous',
  'next',
  'last',
] as const satisfies readonly LineStepControl[];

const STEP_CONTROL_LOOK = {
  first: { icon: 'chevrons-left', variant: 'outlined', labelKey: 'decks.line-stepper.first' },
  previous: { icon: 'chevron-left', variant: 'outlined', labelKey: 'decks.line-stepper.previous' },
  next: { icon: 'chevron-right', variant: 'primary', labelKey: 'decks.line-stepper.next' },
  last: { icon: 'chevrons-right', variant: 'outlined', labelKey: 'decks.line-stepper.last' },
} as const satisfies Record<
  LineStepControl,
  { icon: IconName; variant: IconButtonVariant; labelKey: string }
>;

// @FollowsBlueprint component-lookup-table
const IDEA_BY_READER_STEP: ComponentByFlag<{ idea: Idea | null }> = {
  true: IdeaPanel,
  false: EmptySlot,
};

function isBoardMoveAccepted(): boolean {
  return false;
}

interface DeckLineStepperProps {
  deck: BuiltDeck;
  line: BuiltDeckLine;
  onClose: () => void;
}

// @FollowsBlueprint organism-history-one-page-at-a-time
export function DeckLineStepper({ deck, line, onClose }: DeckLineStepperProps) {
  const { t } = useTranslation();
  const { boardStyle } = useAppState();
  const boardWidth = useBoardWidth();
  const [position, setPosition] = useState(LINE_START_POSITION);
  const steps = listLineSteps(deck, line);
  const step = selectLineStep(steps, position);
  const { theme } = getBoardAppearance(boardStyle);
  const IdeaSlot = IDEA_BY_READER_STEP[`${isReaderStep(step, deck.side)}`];
  return (
    <section
      aria-label={line.name}
      className="flex flex-col gap-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-8 lg:items-start"
    >
      <div className="flex items-center gap-2 -my-1.5 lg:col-span-2 lg:my-0">
        <IconButton label={t('decks.line-stepper.back')} icon="chevron-left" onActivate={onClose} />
        <h3 className="min-w-0 text-base font-bold leading-tight line-clamp-2">{line.name}</h3>
      </div>
      <BoardView
        orientation={deck.side}
        fen={selectLineStepFen(steps, position)}
        onMove={isBoardMoveAccepted}
        arrows={NO_ARROWS}
        highlightSquares={buildLastMoveHighlights(step, theme.highlight)}
        boardStyleId={boardStyle}
        boardWidth={boardWidth}
      />
      <div className="flex flex-col gap-2 w-full">
        <LineStepCaption step={step} position={position} stepCount={steps.length} />
        <IdeaSlot idea={step?.idea ?? null} />
        <ActionBar>
          {STEP_CONTROLS.map((control) => (
            <IconButton
              key={control}
              label={t(STEP_CONTROL_LOOK[control].labelKey)}
              icon={STEP_CONTROL_LOOK[control].icon}
              variant={STEP_CONTROL_LOOK[control].variant}
              isDisabled={isLineStepControlBlocked(position, control, steps.length)}
              onActivate={() => setPosition(moveLineStepPosition(position, control, steps.length))}
            />
          ))}
        </ActionBar>
      </div>
    </section>
  );
}
