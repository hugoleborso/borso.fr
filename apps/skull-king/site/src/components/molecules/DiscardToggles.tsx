import { useTranslation } from 'react-i18next';
import { KRAKEN_CARD_IMAGE, WHITE_WHALE_CARD_IMAGE } from '@site/lib/card-faces.core';
import type { RoundEdit } from '@site/lib/game-edits.core';
import type { GameRound } from '@site/lib/game-view.core';
import { CardTile } from '../atoms/CardTile';

export interface DiscardTogglesProps {
  readonly round: GameRound;
  readonly onChange: (edit: RoundEdit) => void;
}

// @FollowsBlueprint molecule-presentational
export function DiscardToggles({ round, onChange }: DiscardTogglesProps) {
  const { t } = useTranslation();
  return (
    <>
      <CardTile
        source={KRAKEN_CARD_IMAGE}
        label={t('scoring.kraken')}
        isLit={round.isKrakenPlayed}
        badge={null}
        onPress={() => {
          onChange({ isKrakenPlayed: !round.isKrakenPlayed });
        }}
      />
      <CardTile
        source={WHITE_WHALE_CARD_IMAGE}
        label={t('scoring.whiteWhale')}
        isLit={round.isWhiteWhaleDiscard}
        badge={null}
        onPress={() => {
          onChange({ isWhiteWhaleDiscard: !round.isWhiteWhaleDiscard });
        }}
      />
    </>
  );
}
