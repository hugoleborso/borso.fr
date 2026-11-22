import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  formatEntryDetail,
  formatPointsOrPending,
  selectEntry,
  selectEntryPoints,
  selectPointsTone,
} from '@site/lib/game-scores.core';
import type { GamePlayer, GameRound } from '@site/lib/game-view.core';
import { selectRoundCheck } from '@site/lib/round-results.core';
import { PlayerMark } from '../atoms/PlayerMark';
import { ScoreCell } from '../atoms/ScoreCell';

export interface ScoreGridProps {
  readonly players: readonly GamePlayer[];
  readonly rounds: readonly GameRound[];
  readonly onOpenCell: (roundNumber: number, playerId: string) => void;
}

const NO_POINTS = '–';

// @FollowsBlueprint molecule-presentational
export function ScoreGrid({ players, rounds, onOpenCell }: ScoreGridProps) {
  const { t } = useTranslation();
  const columns = {
    gridTemplateColumns: `2.25rem repeat(${String(players.length)}, minmax(0, 1fr))`,
  };
  return (
    <section aria-label={t('scores.detail')} className="overflow-hidden rounded-tile bg-surface">
      <div className="grid py-2" style={columns} aria-hidden="true">
        <span />
        {players.map((player) => (
          <span key={player.id} className="flex justify-center">
            <PlayerMark icon={player.icon} color={player.color} size="tiny" />
          </span>
        ))}
      </div>
      {rounds.map((round) => {
        const check = selectRoundCheck(round, 0);
        return (
          <div key={round.number} className="grid border-t border-ground" style={columns}>
            <span
              aria-label={t('scores.roundCheck', {
                round: round.number,
                counted: check.counted,
                expected: check.expected,
              })}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 text-sm font-bold',
                check.isBalanced ? 'text-muted-2' : 'text-accent',
              )}
            >
              {round.number}
              {check.isBalanced ? null : <span className="size-1.5 rounded-full bg-accent" />}
            </span>
            {players.map((player) => {
              const points = selectEntryPoints(round, player.id);
              const shown = formatPointsOrPending(points, NO_POINTS);
              return (
                <ScoreCell
                  key={player.id}
                  points={shown}
                  tone={selectPointsTone(points)}
                  detail={formatEntryDetail(selectEntry(round, player.id))}
                  label={t('scores.cell', {
                    name: player.name,
                    round: round.number,
                    points: shown,
                  })}
                  onPress={() => {
                    onOpenCell(round.number, player.id);
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
