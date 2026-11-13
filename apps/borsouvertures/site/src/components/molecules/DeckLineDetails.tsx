import { useTranslation } from 'react-i18next';
import { Disclosure } from '@/components/atoms/Disclosure';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { formatNumberedLine, type LineStep } from '@/decks/card.core';
import type { BuiltDeckLine } from '@/decks/deck.utils';
import { selectIdeaText } from '@/decks/idea.utils';
import { buildLineEndFen } from '@/openings/previews.utils';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface DeckLineDetailsProps {
  line: BuiltDeckLine;
  steps: readonly LineStep[];
  side: Side;
  boardStyle: BoardThemeId;
}

// @FollowsBlueprint molecule-presentational
export function DeckLineDetails({ line, steps, side, boardStyle }: DeckLineDetailsProps) {
  const { t, i18n } = useTranslation();
  return (
    <Disclosure
      summary={line.name}
      board={
        <MiniBoard
          fen={buildLineEndFen(line.movesSan)}
          boardStyleId={boardStyle}
          orientation={side}
        />
      }
    >
      <p className="font-mono text-sm break-words" aria-label={t('decks.line-moves')}>
        {formatNumberedLine(line.movesSan)}
      </p>
      <dl className="flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.notation} className="flex flex-col gap-0.5">
            <dt className="font-mono text-sm font-bold">{step.notation}</dt>
            <dd className="max-w-[65ch] leading-relaxed">
              {step.idea === null
                ? t('review.idea.missing')
                : selectIdeaText(step.idea, i18n.language)}
            </dd>
          </div>
        ))}
      </dl>
    </Disclosure>
  );
}
