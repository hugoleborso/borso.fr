import type { RosterPlayer } from '@site/lib/roster.core';
import { NamedMark } from '../atoms/NamedMark';

export interface RosterMarkProps {
  readonly player: RosterPlayer;
  readonly isSeated: boolean;
  readonly label: string;
  readonly onPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function RosterMark({ player, isSeated, label, onPress }: RosterMarkProps) {
  return (
    <li className="flex min-w-0 flex-col items-center">
      <button
        type="button"
        aria-label={label}
        onClick={onPress}
        className="flex max-w-full cursor-pointer justify-center"
      >
        <NamedMark
          icon={player.icon}
          color={player.color}
          name={player.name}
          size="big"
          layout="under"
          nameStyle="label"
          emphasis={isSeated ? 'ringed' : 'faded'}
        />
      </button>
    </li>
  );
}
