import { useTranslation } from 'react-i18next';
import { BONUS_KINDS, BONUS_POINTS, type BonusCounts, type BonusKind } from '@domain/scoring.core';
import { BONUS_CARD_IMAGES } from '@site/lib/card-faces.core';
import { selectBonusBadge } from '@site/lib/game-scores.core';
import { BONUS_KEYS } from '@site/lib/translation-keys.core';
import { CardTile } from '../atoms/CardTile';

export interface BonusStripProps {
  readonly bonuses: BonusCounts;
  readonly onCycle: (kind: BonusKind) => void;
}

// @FollowsBlueprint molecule-presentational
export function BonusStrip({ bonuses, onCycle }: BonusStripProps) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('scoring.bonuses')} className="flex gap-1.5">
      {BONUS_KINDS.map((kind) => (
        <CardTile
          key={kind}
          source={BONUS_CARD_IMAGES[kind]}
          label={t('scoring.bonusCount', { card: t(BONUS_KEYS[kind]), count: bonuses[kind] })}
          isLit={bonuses[kind] > 0}
          badge={selectBonusBadge(bonuses[kind], BONUS_POINTS[kind])}
          onPress={() => {
            onCycle(kind);
          }}
        />
      ))}
    </div>
  );
}
