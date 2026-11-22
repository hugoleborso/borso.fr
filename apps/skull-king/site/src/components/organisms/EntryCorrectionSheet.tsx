import { useTranslation } from 'react-i18next';
import { scoreEntry, selectFinalBid, selectTricksTaken } from '@domain/scoring.core';
import {
  cycleBonus,
  cycleRascalBet,
  type EntryEdit,
  selectNextBidAdjustment,
} from '@site/lib/game-edits.core';
import { formatPointsOrPending, selectEntry, selectPointsTone } from '@site/lib/game-scores.core';
import type { GameEntry, GamePlayer, GameRound } from '@site/lib/game-view.core';
import { useReadLatestEntry, useWriteEntry, useWriteRound } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import {
  isHarryLocked,
  isRascalLocked,
  selectRoundCheck,
  selectTricksWrite,
} from '@site/lib/round-results.core';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { PlayerMark } from '../atoms/PlayerMark';
import { PointsText } from '../atoms/PointsText';
import { Sheet } from '../atoms/Sheet';
import { TrickTally } from '../atoms/TrickTally';
import { AbilityStrip } from '../molecules/AbilityStrip';
import { BonusStrip } from '../molecules/BonusStrip';
import { ChipRow } from '../molecules/ChipRow';
import { DiscardToggles } from '../molecules/DiscardToggles';

export interface EntryCorrectionSheetProps {
  readonly joinCode: string;
  readonly round: GameRound;
  readonly player: GamePlayer;
  readonly onClose: () => void;
}

const NO_POINTS = '–';

// @FollowsBlueprint organism-query-owning
export function EntryCorrectionSheet({
  joinCode,
  round,
  player,
  onClose,
}: EntryCorrectionSheetProps) {
  const { t } = useTranslation();
  const writeEntry = useWriteEntry(joinCode);
  const writeRound = useWriteRound(joinCode);
  const readLatestEntry = useReadLatestEntry(joinCode);
  const entry = selectEntry(round, player.id);
  if (entry === null) return null;
  const points = scoreEntry(entry, round.cardCount);
  const check = selectRoundCheck(round, 0);

  const readLatest = (rendered: GameEntry): GameEntry =>
    readLatestEntry(round.number, player.id) ?? rendered;

  const write = (edit: EntryEdit) => {
    writeEntry.mutate({ roundNumber: round.number, playerId: player.id, edit });
  };

  return (
    <Sheet
      label={t('scores.correction', { name: player.name, round: round.number })}
      onClose={onClose}
    >
      <div className="flex items-center gap-2.5">
        <PlayerMark icon={player.icon} color={player.color} size="small" />
        <span className="font-display text-3xl">{t('common.round', { number: round.number })}</span>
        <PointsText
          text={formatPointsOrPending(points, NO_POINTS)}
          tone={selectPointsTone(points)}
          size="huge"
          className="ml-auto"
        />
      </div>
      <div className="flex items-center gap-2.5">
        <span role="img" aria-label={t('scores.bid')} className="text-muted-2">
          <Glyph name="bid" />
        </span>
        <ChipRow
          label={t('scores.bid')}
          highest={round.cardCount}
          chosen={entry.bid}
          blocked={null}
          tone="accent"
          surface="card"
          onPick={(value) => {
            write({ bid: selectTricksWrite(value, entry.bid) });
          }}
        />
      </div>
      <div className="flex items-center gap-2.5">
        <span role="img" aria-label={t('scores.tricks')} className="text-muted-2">
          <Glyph name="tricks" />
        </span>
        <ChipRow
          label={t('scores.tricks')}
          highest={round.cardCount}
          chosen={selectTricksTaken(entry)}
          blocked={null}
          tone="accent"
          surface="card"
          onPick={(value) => {
            write({ tricks: selectTricksWrite(value, selectFinalBid(entry)) });
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <BonusStrip
          bonuses={entry.bonuses}
          onCycle={(kind) => {
            write({ bonuses: cycleBonus(readLatest(entry).bonuses, kind) });
          }}
        />
        <AbilityStrip
          entry={entry}
          isHarryLocked={isHarryLocked(round.entries, entry)}
          isRascalLocked={isRascalLocked(round.entries, entry)}
          onAdjustBid={(picked) => {
            write({
              bidAdjustment: selectNextBidAdjustment(readLatest(entry).bidAdjustment, picked),
            });
          }}
          onRaiseRascalBet={() => {
            write({ rascalBet: cycleRascalBet(readLatest(entry).rascalBet) });
          }}
        />
      </div>
      <ErrorNote code={readRejectionCode(writeEntry.error ?? writeRound.error)} />
      <div className="flex items-center gap-2">
        <TrickTally
          counted={check.counted}
          expected={check.expected}
          isBalanced={check.isBalanced}
          label={t('scoring.tally', { counted: check.counted, expected: check.expected })}
          size="medium"
        />
        <DiscardToggles
          round={round}
          onChange={(edit) => {
            writeRound.mutate({ roundNumber: round.number, edit });
          }}
        />
        <Button
          variant="primary"
          aria-label={t('common.done')}
          className="h-14 flex-1"
          onClick={onClose}
        >
          <Glyph name="check" className="size-6" strokeWidth={3} />
        </Button>
      </div>
    </Sheet>
  );
}
