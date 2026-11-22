import { useTranslation } from 'react-i18next';
import {
  type BidAdjustment,
  type BonusKind,
  scoreEntry,
  selectFinalBid,
} from '@domain/scoring.core';
import { formatPointsOrPending, selectPointsTone } from '@site/lib/game-scores.core';
import { formatBid, isAwaitingTricks } from '@site/lib/round-results.core';
import type { GameEntry, GamePlayer } from '@site/lib/game-view.core';
import { Button } from '../atoms/Button';
import { Glyph } from '../atoms/Glyph';
import { PlayerMark } from '../atoms/PlayerMark';
import { PointsText } from '../atoms/PointsText';
import { AbilityStrip } from '../molecules/AbilityStrip';
import { BonusStrip } from '../molecules/BonusStrip';
import { ChipRow } from '../molecules/ChipRow';

export interface ResultCardProps {
  readonly player: GamePlayer;
  readonly entry: GameEntry;
  readonly cardCount: number;
  readonly isMissed: boolean;
  readonly isHarryLocked: boolean;
  readonly isRascalLocked: boolean;
  readonly onToggle: () => void;
  readonly onTricks: (tricks: number) => void;
  readonly onCycleBonus: (kind: BonusKind) => void;
  readonly onAdjustBid: (picked: BidAdjustment) => void;
  readonly onRaiseRascalBet: () => void;
}

// @FollowsBlueprint organism-presentational
export function ResultCard(props: ResultCardProps) {
  const { t } = useTranslation();
  const { player, entry, cardCount, isMissed } = props;
  const isAwaiting = isAwaitingTricks(entry, isMissed);
  const points = isAwaiting ? null : scoreEntry(entry, cardCount);
  const bidLabel = entry.bid === null ? t('scoring.noBid') : t('scoring.bid', { bid: entry.bid });

  return (
    <section aria-label={player.name} className="flex flex-col gap-3 rounded-tile p-3 bg-surface">
      <div className="flex items-center gap-2.5">
        <PlayerMark icon={player.icon} color={player.color} size="small" />
        <span
          aria-label={bidLabel}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-lg font-extrabold whitespace-nowrap bg-surface-2"
        >
          {formatBid(entry)}
        </span>
        <PointsText
          text={formatPointsOrPending(points, '?')}
          tone={selectPointsTone(points)}
          size="large"
          className="ml-auto"
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
        <ChipRow
          label={t('scoring.tricksOf', { name: player.name })}
          highest={cardCount}
          chosen={entry.tricks}
          blocked={selectFinalBid(entry)}
          tone="missed"
          surface="card"
          onPick={props.onTricks}
        />
      ) : (
        <BonusStrip bonuses={entry.bonuses} onCycle={props.onCycleBonus} />
      )}
      <AbilityStrip
        entry={entry}
        isHarryLocked={props.isHarryLocked}
        isRascalLocked={props.isRascalLocked}
        onAdjustBid={props.onAdjustBid}
        onRaiseRascalBet={props.onRaiseRascalBet}
      />
    </section>
  );
}
