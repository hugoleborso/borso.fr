import { useTranslation } from 'react-i18next';
import { KRAKEN_CARD_IMAGE, WHITE_WHALE_CARD_IMAGE } from '@site/lib/card-faces.core';
import type { RoundEdit } from '@site/lib/game-edits.core';
import type { GameRound } from '@site/lib/game-view.core';
import { CardTile } from '../atoms/CardTile';

const DISCARD_CARDS = [
  { field: 'isKrakenPlayed', source: KRAKEN_CARD_IMAGE, labelKey: 'scoring.kraken' },
  { field: 'isWhiteWhaleDiscard', source: WHITE_WHALE_CARD_IMAGE, labelKey: 'scoring.whiteWhale' },
] as const satisfies readonly {
  readonly field: keyof RoundEdit;
  readonly source: string;
  readonly labelKey: string;
}[];

export interface DiscardTogglesProps {
  readonly round: GameRound;
  readonly onChange: (edit: RoundEdit) => void;
}

// @FollowsBlueprint molecule-presentational
export function DiscardToggles({ round, onChange }: DiscardTogglesProps) {
  const { t } = useTranslation();
  return (
    <>
      {DISCARD_CARDS.map((card) => (
        <CardTile
          key={card.field}
          source={card.source}
          label={t(card.labelKey)}
          isLit={round[card.field]}
          badge={null}
          onPress={() => {
            onChange({ [card.field]: !round[card.field] });
          }}
        />
      ))}
    </>
  );
}
