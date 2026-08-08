import { LearnPickPrompt } from '@/components/molecules/LearnPickPrompt';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import {
  findLearnDrillTarget,
  isLearnDrillReady,
  type LearnDrillTarget,
} from '@/openings/learnSession.core';
import type { TreeVisualization } from '@/openings/sessionStart.core';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import { LearnDrill } from './LearnDrill';
import type { SessionBodyProps } from './session.types';

interface DrillProps {
  target: LearnDrillTarget;
  side: Side;
  boardStyle: BoardThemeId;
  visualization: TreeVisualization;
}

const DRILL_BY_READINESS: ComponentByFlag<DrillProps> = {
  true: LearnDrill,
  false: LearnPickPrompt,
};

export function LearnTreeSession({
  openings,
  selection,
  side,
  boardStyle,
  visualization,
}: SessionBodyProps) {
  const target = findLearnDrillTarget(openings, selection);
  const Drill = DRILL_BY_READINESS[`${isLearnDrillReady(target)}`];
  return (
    <Drill
      key={`${target.variation.id}|${side}`}
      target={target}
      side={side}
      boardStyle={boardStyle}
      visualization={visualization}
    />
  );
}
