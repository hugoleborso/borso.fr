import clsx from 'clsx';
import { formatSignedPoints, selectPointsTone, type Standing } from '@site/lib/game-scores.core';
import { PlayerMark } from '../atoms/PlayerMark';
import { PointsText } from '../atoms/PointsText';

export interface RankingTileProps {
  readonly standing: Standing;
  readonly isLeader: boolean;
  readonly isMine: boolean;
  readonly claimLabel: string | null;
  readonly onClaim: () => void;
}

// @FollowsBlueprint molecule-presentational
export function RankingTile({ standing, isLeader, isMine, claimLabel, onClaim }: RankingTileProps) {
  const { player, total, lastDelta } = standing;
  return (
    <li
      aria-label={`${player.name} ${String(total)}`}
      className={clsx(
        'flex flex-col items-center gap-1 rounded-tile px-1 py-3',
        isLeader ? 'bg-accent-shade ring-2 ring-inset ring-accent-deep' : 'bg-surface',
      )}
    >
      {claimLabel === null ? (
        <PlayerMark
          icon={player.icon}
          color={player.color}
          size="medium"
          emphasis={isMine ? 'ringed' : 'plain'}
        />
      ) : (
        <button
          type="button"
          aria-label={claimLabel}
          onClick={onClaim}
          className="cursor-pointer rounded-full"
        >
          <PlayerMark icon={player.icon} color={player.color} size="medium" />
        </button>
      )}
      <span className="text-2xl font-extrabold tabular-nums">{total}</span>
      {lastDelta === null ? null : (
        <PointsText
          text={formatSignedPoints(lastDelta)}
          tone={selectPointsTone(lastDelta)}
          size="small"
        />
      )}
    </li>
  );
}
