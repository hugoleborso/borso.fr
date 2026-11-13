import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { PIECE_LABEL_KEY_BY_TYPE } from '@/components/atoms/boardPieces';
import type { LineMoveKind, LineStep } from '@/decks/card.core';
import type { Side } from '@/state/persistedState.utils';

const KINGSIDE_KEY_BY_SIDE = {
  white: 'decks.line-stepper.castle.kingside-white',
  black: 'decks.line-stepper.castle.kingside-black',
} as const satisfies Record<Side, string>;

const QUEENSIDE_KEY_BY_SIDE = {
  white: 'decks.line-stepper.castle.queenside-white',
  black: 'decks.line-stepper.castle.queenside-black',
} as const satisfies Record<Side, string>;

function describePieceMove(translate: TFunction, step: LineStep): string {
  return translate(PIECE_LABEL_KEY_BY_TYPE[step.piece], { square: step.fromSquare });
}

// @FollowsBlueprint component-lookup-table
const DESCRIBE_BY_KIND = {
  move: (translate, step) =>
    translate('decks.line-stepper.move', {
      piece: describePieceMove(translate, step),
      square: step.toSquare,
    }),
  capture: (translate, step) =>
    translate('decks.line-stepper.capture', {
      piece: describePieceMove(translate, step),
      square: step.toSquare,
    }),
  'castle-kingside': (translate, step) => translate(KINGSIDE_KEY_BY_SIDE[step.mover]),
  'castle-queenside': (translate, step) => translate(QUEENSIDE_KEY_BY_SIDE[step.mover]),
} as const satisfies Record<LineMoveKind, (translate: TFunction, step: LineStep) => string>;

interface LineStepCaptionProps {
  step: LineStep | null;
  position: number;
  stepCount: number;
}

// @FollowsBlueprint molecule-presentational
export function LineStepCaption({ step, position, stepCount }: LineStepCaptionProps) {
  const { t } = useTranslation();
  const notation = step?.notation ?? t('decks.line-stepper.start');
  const words = step === null ? '' : DESCRIBE_BY_KIND[step.kind](t, step);
  return (
    <div className="flex flex-col min-h-11" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-base font-bold">{notation}</p>
        <p className="text-sm text-ink-muted tabular-nums">
          {t('decks.line-stepper.position', { position, total: stepCount })}
        </p>
      </div>
      <p className="truncate first-letter:uppercase">{words}</p>
    </div>
  );
}
