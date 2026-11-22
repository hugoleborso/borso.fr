import clsx from 'clsx';
import type { RosterPlayer } from '@site/lib/roster.core';
import { PlayerMark } from '../atoms/PlayerMark';

export interface RosterMarkProps {
  readonly player: RosterPlayer;
  readonly isSeated: boolean;
  readonly label: string;
  readonly onPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function RosterMark({ player, isSeated, label, onPress }: RosterMarkProps) {
  return (
    <li className="flex min-w-0 flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        onClick={onPress}
        className="cursor-pointer rounded-full"
      >
        <PlayerMark
          icon={player.icon}
          color={player.color}
          size="big"
          emphasis={isSeated ? 'ringed' : 'faded'}
        />
      </button>
      <span
        className={clsx(
          'max-w-full truncate text-sm font-semibold',
          isSeated ? 'text-text' : 'text-muted-2',
        )}
      >
        {player.name}
      </span>
    </li>
  );
}
