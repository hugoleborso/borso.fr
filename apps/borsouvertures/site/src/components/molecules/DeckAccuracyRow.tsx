import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';
import type { BuiltDeck } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import type { DeckShare, RecallShareKind } from '@/review/retention.core';

type DeckMeasure = 'retention' | 'accuracy';

const LABEL_KEY_BY_MEASURE = {
  retention: {
    measured: 'stats.recent-retention.measured',
    empty: 'stats.recent-retention.empty',
  },
  accuracy: {
    measured: 'stats.accuracy.measured',
    empty: 'stats.accuracy.empty',
  },
} as const satisfies Record<DeckMeasure, Record<RecallShareKind, string>>;

interface DeckAccuracyRowProps {
  deck: BuiltDeck;
  share: DeckShare;
  measure: DeckMeasure;
}

// @FollowsBlueprint molecule-presentational
export function DeckAccuracyRow({ deck, share, measure }: DeckAccuracyRowProps) {
  const { t, i18n } = useTranslation();
  return (
    <StatusItem
      label={selectDeckName(
        i18n.getResource(i18n.language, 'translation', deck.nameKey),
        deck.nameKey,
      )}
      value={t(LABEL_KEY_BY_MEASURE[measure][share.kind], {
        percent: share.percent,
        recalled: share.recalled,
        reviews: share.reviews,
      })}
    />
  );
}
