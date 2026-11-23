import { useTranslation } from 'react-i18next';
import { type BidAdjustment, type BonusKind, scoreEntry } from '@domain/scoring.core';
import type { StepDirection } from '@site/lib/ability-stepper.core';
import { selectCountSteps, stepMissedTricks } from '@site/lib/count-stepper.core';
import { formatPointsOrPending, selectPointsTone } from '@site/lib/game-scores.core';
import { formatBid, isAwaitingTricks } from '@site/lib/round-results.core';
import type { GameEntry, GamePlayer } from '@site/lib/game-view.core';
import { Button } from '../atoms/Button';
import { Glyph } from '../atoms/Glyph';
import { NamedMark } from '../atoms/NamedMark';
import { PointsText } from '../atoms/PointsText';
import { AbilityStrip } from '../molecules/AbilityStrip';
import { BonusStrip } from '../molecules/BonusStrip';
import { CountStepper } from '../molecules/CountStepper';

export interface ResultCardProps {
  readonly player: GamePlayer;
  readonly entry: GameEntry;
  readonly cardCount: number;
  readonly isHarryLocked: boolean;
  readonly isRascalLocked: boolean;
  readonly onToggle: () => void;
  readonly onStepTricks: (direction: StepDirection) => void;
  readonly onAddBonus: (kind: BonusKind) => void;
  readonly onRemoveBonus: (kind: BonusKind) => void;
  readonly onAdjustBid: (picked: BidAdjustment) => void;
  readonly onStepRascalBet: (direction: StepDirection) => void;
}

// @FollowsBlueprint organism-presentational
export function ResultCard(props: ResultCardProps) {
  const { t } = useTranslation();
  const { player, entry, cardCount } = props;
  const { isMissed } = entry;
  const isAwaiting = isAwaitingTricks(entry);
  const points = isAwaiting ? null : scoreEntry(entry, cardCount);
  const bidLabel = entry.bid === null ? t('scoring.noBid') : t('scoring.bid', { bid: entry.bid });

  return (
    <section aria-label={player.name} className="flex flex-col gap-3 rounded-tile p-3 panel">
      <div className="flex items-center gap-2.5">
        <NamedMark
          avatar={player.avatar}
          color={player.color}
          name={player.name}
          size="small"
          layout="beside"
          nameStyle="label"
        />
        <span
          aria-label={bidLabel}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-lg font-extrabold whitespace-nowrap border border-outline bg-surface-2"
        >
          {formatBid(entry)}
        </span>
        <PointsText
          text={formatPointsOrPending(points, '?')}
          tone={selectPointsTone(points)}
          size="large"
        />
        <Button
          variant={isMissed ? 'missed' : 'made'}
          aria-label={isMissed ? t('scoring.missed') : t('scoring.made')}
          aria-pressed={isMissed}
          onClick={props.onToggle}
        >
          <Glyph name={isMissed ? 'cross' : 'check'} strokeWidth={3} />
        </Button>
      </div>
      {isMissed ? (
        <CountStepper
          label={t('scoring.tricksOf', { name: player.name })}
          count={entry.tricks}
          steps={selectCountSteps((direction) => stepMissedTricks(entry, direction, cardCount))}
          onStep={props.onStepTricks}
        />
      ) : (
        <BonusStrip
          bonuses={entry.bonuses}
          onAdd={props.onAddBonus}
          onRemove={props.onRemoveBonus}
        />
      )}
      <AbilityStrip
        entry={entry}
        isHarryLocked={props.isHarryLocked}
        isRascalLocked={props.isRascalLocked}
        onAdjustBid={props.onAdjustBid}
        onStepRascalBet={props.onStepRascalBet}
      />
    </section>
  );
}
