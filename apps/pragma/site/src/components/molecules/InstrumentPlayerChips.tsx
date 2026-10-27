/** @Feature instruments */

import type { JSX } from 'react';
import { Chip } from '../atoms/Chip';
import { MemberChip } from './MemberChip';

const MEMBER_CHOICE_CLASS =
  'relative z-10 min-w-11 justify-center bg-transparent px-0 aria-pressed:bg-transparent aria-pressed:text-ink';
const PRIMARY_MEMBER_RING_CLASS = 'rounded-pill ring-2 ring-ink ring-offset-2 ring-offset-leaf';

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
    <span className="inline-flex flex-wrap items-center">
      {players.map((player) => (
        <Chip
          key={player.memberId}
          pressed={player.isPrimary}
          aria-label={`${toggleLabel} — ${player.memberName}`}
          title={`${toggleLabel} — ${player.memberName}`}
          onPress={() => onTogglePrimary(player.memberId)}
          className={MEMBER_CHOICE_CLASS}
        >
          <MemberChip
            memberName={player.memberName}
            memberColor={player.memberColor}
            size="xs"
            className={player.isPrimary ? PRIMARY_MEMBER_RING_CLASS : undefined}
          />
        </Chip>
      ))}
    </span>
  );
}
