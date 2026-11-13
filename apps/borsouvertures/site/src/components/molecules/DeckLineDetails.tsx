import { useTranslation } from 'react-i18next';
import { Disclosure } from '@/components/atoms/Disclosure';
import { formatNumberedLine, type LineStep } from '@/decks/card.core';
import type { BuiltDeckLine } from '@/decks/deck.utils';
import { selectIdeaText } from '@/decks/idea.utils';

interface DeckLineDetailsProps {
  line: BuiltDeckLine;
  steps: readonly LineStep[];
}

// @FollowsBlueprint molecule-presentational
export function DeckLineDetails({ line, steps }: DeckLineDetailsProps) {
  const { t, i18n } = useTranslation();
  return (
    <Disclosure summary={line.name}>
      <p className="font-mono text-sm break-words" aria-label={t('decks.line-moves')}>
        {formatNumberedLine(line.movesSan)}
      </p>
      <dl className="flex flex-col gap-2">
        {steps.map((step) => (
          <div key={step.notation}>
            <dt className="font-mono text-sm font-bold">{step.notation}</dt>
            <dd className="opacity-90">
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
