/** @Feature instruments */

import type { JSX } from 'react';
import { Chip } from '../atoms/Chip';
import { MemberChip } from './MemberChip';

const MEMBER_CHOICE_CLASS =
  'relative z-10 size-9 justify-center bg-transparent p-0 aria-pressed:bg-transparent aria-pressed:text-ink ' +
  'after:absolute after:-inset-1 after:content-[""]';
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
    <span className="flex max-w-28 shrink-0 flex-wrap items-center justify-end">
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
