/** @Feature instruments */

import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { MemberChip } from './MemberChip';

const PRIMARY_CLASS = 'ring-2 ring-accent rounded-full';

export interface InstrumentPlayerChip {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly isPrimary: boolean;
}

export interface InstrumentPlayerChipsProps {
  readonly players: readonly InstrumentPlayerChip[];
  readonly toggleLabel: string;
  readonly onTogglePrimary: (memberId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function InstrumentPlayerChips({
  players,
  toggleLabel,
  onTogglePrimary,
}: InstrumentPlayerChipsProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      {players.map((player) => (
        <button
          key={player.memberId}
          type="button"
          aria-pressed={player.isPrimary}
          aria-label={`${toggleLabel} — ${player.memberName}`}
          title={`${toggleLabel} — ${player.memberName}`}
          onClick={() => onTogglePrimary(player.memberId)}
          className={composeClassName(
            'relative z-10 inline-flex cursor-pointer items-center border-0 bg-transparent p-0.5',
            player.isPrimary && PRIMARY_CLASS,
          )}
        >
          <MemberChip memberName={player.memberName} memberColor={player.memberColor} size="sm" />
        </button>
      ))}
    </span>
  );
}
