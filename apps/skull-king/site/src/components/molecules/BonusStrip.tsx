import { useTranslation } from 'react-i18next';
import { BONUS_KINDS, BONUS_POINTS, type BonusCounts, type BonusKind } from '@domain/scoring.core';
import { hasBonus, isBonusFull } from '@site/lib/bonus-count.core';
import { BONUS_CARD_IMAGES } from '@site/lib/card-faces.core';
import { selectBonusBadge } from '@site/lib/game-scores.core';
import { BONUS_KEYS } from '@site/lib/translation-keys.core';
import { Button } from '../atoms/Button';
import { CardTile } from '../atoms/CardTile';

export interface BonusStripProps {
  readonly bonuses: BonusCounts;
  readonly onAdd: (kind: BonusKind) => void;
  readonly onRemove: (kind: BonusKind) => void;
}

const MINUS_SIGN = '−';

// @FollowsBlueprint molecule-presentational
export function BonusStrip({ bonuses, onAdd, onRemove }: BonusStripProps) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('scoring.bonuses')}
      className="flex flex-wrap items-start gap-1.5"
    >
      {BONUS_KINDS.map((kind) => {
        const card = t(BONUS_KEYS[kind]);
        const isFull = isBonusFull(bonuses, kind);
        const hasCard = hasBonus(bonuses, kind);
        return (
          <div key={kind} className="flex flex-col items-center gap-2">
            <CardTile
              source={BONUS_CARD_IMAGES[kind]}
              label={t('scoring.bonusCount', { card, count: bonuses[kind] })}
              isLit={hasCard}
              badge={selectBonusBadge(bonuses[kind], BONUS_POINTS[kind])}
              onPress={() => {
                if (!isFull) onAdd(kind);
              }}
            />
            {hasCard ? (
              <Button
                variant="raised"
                size="stepSquare"
                aria-label={t('scoring.bonusRemove', { card })}
                onClick={() => {
                  onRemove(kind);
                }}
              >
                {MINUS_SIGN}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
