/** @Feature instruments */

import type { JSX } from 'react';
import { Chip } from '../atoms/Chip';
import { MemberChip } from './MemberChip';

const MEMBER_CHOICE_CLASS =
  'relative z-10 bg-transparent px-0.5 aria-pressed:bg-transparent aria-pressed:text-ink aria-pressed:ring-2 aria-pressed:ring-ink';

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
        <Chip
          key={player.memberId}
          pressed={player.isPrimary}
          aria-label={`${toggleLabel} — ${player.memberName}`}
          title={`${toggleLabel} — ${player.memberName}`}
          onPress={() => onTogglePrimary(player.memberId)}
          className={MEMBER_CHOICE_CLASS}
        >
          <MemberChip memberName={player.memberName} memberColor={player.memberColor} size="xs" />
        </Chip>
      ))}
    </span>
  );
}
