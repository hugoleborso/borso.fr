import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BidAdjustment } from '@domain/scoring.core';
import {
  type Ability,
  type OpenAbility,
  selectHarrySteps,
  selectOpenAfterStep,
  selectRascalSteps,
  type StepDirection,
  type StepView,
  toggleAbility,
} from '@site/lib/ability-stepper.core';
import { HARRY_CARD_IMAGE, RASCAL_CARD_IMAGE } from '@site/lib/card-faces.core';
import type { GameEntry } from '@site/lib/game-view.core';
import { formatBidAdjustment, formatRascalBadge } from '@site/lib/round-results.core';
import { CardTile } from '../atoms/CardTile';
import { Stepper } from '../atoms/Stepper';

export interface AbilityStripProps {
  readonly entry: GameEntry;
  readonly isHarryLocked: boolean;
  readonly isRascalLocked: boolean;
  readonly onAdjustBid: (picked: BidAdjustment) => void;
  readonly onStepRascalBet: (direction: StepDirection) => void;
}

// @FollowsBlueprint molecule-local-state
export function AbilityStrip(props: AbilityStripProps) {
  const { entry, isHarryLocked, isRascalLocked, onAdjustBid, onStepRascalBet } = props;
  const { t } = useTranslation();
  const [openAbility, setOpenAbility] = useState<OpenAbility>(null);
  const adjustment = formatBidAdjustment(entry.bidAdjustment);
  const rascalBadge = formatRascalBadge(entry);
  const stepsOf: Readonly<Record<Ability, readonly StepView[]>> = {
    harry: selectHarrySteps(entry.bidAdjustment),
    rascal: selectRascalSteps(entry.rascalBet),
  };
  const onStepOf: Readonly<Record<Ability, (direction: StepDirection) => void>> = {
    harry: onAdjustBid,
    rascal: onStepRascalBet,
  };

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
          setOpenAbility(toggleAbility(openAbility, 'harry'));
        }}
      />
      <CardTile
        source={RASCAL_CARD_IMAGE}
        size="small"
        label={t('scoring.rascal', { bet: entry.rascalBet })}
        isLit={rascalBadge !== null}
        badge={rascalBadge}
        isDisabled={isRascalLocked}
        onPress={() => {
          setOpenAbility(toggleAbility(openAbility, 'rascal'));
        }}
      />
      {openAbility === null ? null : (
        <Stepper
          className="ml-auto"
          steps={stepsOf[openAbility].map((step) => ({
            text: step.text,
            label: t(step.labelKey),
            isDisabled: step.isDisabled,
            isPressed: step.isPressed,
            onPress: () => {
              onStepOf[openAbility](step.direction);
              setOpenAbility(selectOpenAfterStep(openAbility));
            },
          }))}
        />
      )}
    </div>
  );
}
