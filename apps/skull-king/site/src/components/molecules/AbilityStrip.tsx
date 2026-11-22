import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BidAdjustment } from '@domain/scoring.core';
import { HARRY_CARD_IMAGE, RASCAL_CARD_IMAGE } from '@site/lib/card-faces.core';
import type { GameEntry } from '@site/lib/game-view.core';
import { formatBidAdjustment, formatRascalBadge } from '@site/lib/round-results.core';
import { Button } from '../atoms/Button';
import { CardTile } from '../atoms/CardTile';

export interface AbilityStripProps {
  readonly entry: GameEntry;
  readonly isHarryLocked: boolean;
  readonly isRascalLocked: boolean;
  readonly onAdjustBid: (picked: BidAdjustment) => void;
  readonly onRaiseRascalBet: () => void;
}

const MINUS_ONE = '\u22121';
const PLUS_ONE = '+1';

// @FollowsBlueprint molecule-local-state
export function AbilityStrip(props: AbilityStripProps) {
  const { entry, isHarryLocked, isRascalLocked, onAdjustBid, onRaiseRascalBet } = props;
  const { t } = useTranslation();
  const [isHarryOpen, setIsHarryOpen] = useState(false);
  const adjustment = formatBidAdjustment(entry.bidAdjustment);
  const rascalBadge = formatRascalBadge(entry);

  return (
    <div className="flex items-center gap-1.5">
      <CardTile
        source={HARRY_CARD_IMAGE}
        size="small"
        label={t('scoring.harry', { adjustment: adjustment ?? t('scoring.harryNone') })}
        isLit={adjustment !== null}
        badge={adjustment}
        isDisabled={isHarryLocked}
        onPress={() => {
          setIsHarryOpen(!isHarryOpen);
        }}
      />
      <CardTile
        source={RASCAL_CARD_IMAGE}
        size="small"
        label={t('scoring.rascal', { bet: entry.rascalBet })}
        isLit={rascalBadge !== null}
        badge={rascalBadge}
        isDisabled={isRascalLocked}
        onPress={onRaiseRascalBet}
      />
      {isHarryOpen ? (
        <div className="ml-auto flex gap-2">
          <Button
            variant="surface"
            aria-label={t('scoring.harryMinus')}
            aria-pressed={entry.bidAdjustment < 0}
            className="h-11 w-14 text-lg font-extrabold bg-surface-2"
            onClick={() => {
              onAdjustBid(-1);
              setIsHarryOpen(false);
            }}
          >
            {MINUS_ONE}
          </Button>
          <Button
            variant="surface"
            aria-label={t('scoring.harryPlus')}
            aria-pressed={entry.bidAdjustment > 0}
            className="h-11 w-14 text-lg font-extrabold bg-surface-2"
            onClick={() => {
              onAdjustBid(1);
              setIsHarryOpen(false);
            }}
          >
            {PLUS_ONE}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
