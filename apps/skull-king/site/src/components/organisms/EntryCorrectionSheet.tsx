import { useTranslation } from 'react-i18next';
import { scoreEntry, selectTricksTaken } from '@domain/scoring.core';
import { addBonus, removeBonus } from '@site/lib/bonus-count.core';
import {
  selectBidStepEdit,
  selectCountSteps,
  selectTricksTakenStepEdit,
  stepBid,
  stepTricksTaken,
} from '@site/lib/count-stepper.core';
import { type EntryEdit, selectNextBidAdjustment, stepRascalBet } from '@site/lib/game-edits.core';
import { formatPointsOrPending, selectEntry, selectPointsTone } from '@site/lib/game-scores.core';
import type { GameEntry, GamePlayer, GameRound } from '@site/lib/game-view.core';
import { useReadLatestEntry, useWriteEntry, useWriteRound } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { isHarryLocked, isRascalLocked, selectRoundCheck } from '@site/lib/round-results.core';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { NamedMark } from '../atoms/NamedMark';
import { PointsText } from '../atoms/PointsText';
import { Sheet } from '../atoms/Sheet';
import { TrickTally } from '../atoms/TrickTally';
import { AbilityStrip } from '../molecules/AbilityStrip';
import { BonusStrip } from '../molecules/BonusStrip';
import { CountStepper } from '../molecules/CountStepper';
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
  const check = selectRoundCheck(round);

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
        <NamedMark
          icon={player.icon}
          color={player.color}
          name={player.name}
          size="small"
          layout="beside"
          nameStyle="label"
        />
        <span className="shrink-0 font-display text-3xl">
          {t('common.round', { number: round.number })}
        </span>
        <PointsText
          text={formatPointsOrPending(points, NO_POINTS)}
          tone={selectPointsTone(points)}
          size="huge"
        />
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-lg font-bold text-muted-2">{t('scores.bid')}</span>
        <CountStepper
          label={t('scores.bid')}
          count={entry.bid}
          steps={selectCountSteps((direction) => stepBid(entry.bid, direction, round.cardCount))}
          onStep={(direction) => {
            write(selectBidStepEdit(readLatest(entry).bid, direction, round.cardCount));
          }}
        />
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-lg font-bold text-muted-2">{t('scores.tricks')}</span>
        <CountStepper
          label={t('scores.tricks')}
          count={selectTricksTaken(entry)}
          steps={selectCountSteps((direction) =>
            stepTricksTaken(entry, direction, round.cardCount),
          )}
          onStep={(direction) => {
            write(selectTricksTakenStepEdit(readLatest(entry), direction, round.cardCount));
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <BonusStrip
          bonuses={entry.bonuses}
          onAdd={(kind) => {
            write({ bonuses: addBonus(readLatest(entry).bonuses, kind) });
          }}
          onRemove={(kind) => {
            write({ bonuses: removeBonus(readLatest(entry).bonuses, kind) });
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
          onStepRascalBet={(step) => {
            write({ rascalBet: stepRascalBet(readLatest(entry).rascalBet, step) });
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
          className="flex-1"
          onClick={onClose}
        >
          <Glyph name="check" className="size-6" strokeWidth={3} />
        </Button>
      </div>
    </Sheet>
  );
}
