import { useTranslation } from 'react-i18next';
import type { ValueByFlag } from '@/lib/componentTable.types';
import { EVALUATION_BAR_WIDTH_PX } from '@/lib/viewport.utils';
import type { EvaluationBarView, EvaluationTextEnd } from '@/opponent/stockfish-evaluation.core';

const PERCENT = 100;

const BAR_CLASS_BY_VISIBLE: ValueByFlag<string> = {
  true: 'relative shrink-0 overflow-hidden bg-evaluation-black',
  false: 'relative shrink-0 overflow-hidden invisible',
};

const FILL_ORIGIN_BY_WHITE_AT_BOTTOM: ValueByFlag<string> = {
  true: 'bottom',
  false: 'top',
};

const TEXT_BASE =
  'absolute inset-x-0 text-center text-evaluation font-bold leading-none tabular-nums ' +
  'tracking-[-0.04em]';

const TEXT_CLASS_BY_END = {
  top: `${TEXT_BASE} top-1`,
  bottom: `${TEXT_BASE} bottom-1`,
} as const satisfies Record<EvaluationTextEnd, string>;

const TEXT_TONE_BY_ON_WHITE: ValueByFlag<string> = {
  true: 'text-on-evaluation-white',
  false: 'text-on-evaluation-black',
};

interface EvaluationBarProps {
  view: EvaluationBarView;
}

// @FollowsBlueprint atom-plain
export function EvaluationBar({ view }: EvaluationBarProps) {
  const { t } = useTranslation();
  return (
    <div
      role="img"
      aria-label={t(view.labelKey, { amount: view.amount, moveCount: view.moveCount })}
      className={BAR_CLASS_BY_VISIBLE[`${view.isVisible}`]}
      style={{ width: `${EVALUATION_BAR_WIDTH_PX}px` }}
    >
      <div
        className="absolute inset-0 bg-evaluation-white motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out-quick"
        style={{
          transform: `scaleY(${view.whiteSharePercent / PERCENT})`,
          transformOrigin: FILL_ORIGIN_BY_WHITE_AT_BOTTOM[`${view.isWhiteAtBottom}`],
        }}
      />
      <span aria-hidden="true" className={TEXT_TONE_BY_ON_WHITE[`${view.isTextOnWhite}`]}>
        <span className={TEXT_CLASS_BY_END[view.textEnd]}>{view.text}</span>
      </span>
    </div>
  );
}
