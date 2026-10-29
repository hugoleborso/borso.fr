/** @Feature instruments */

import type { JSX } from 'react';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { MemberChip } from './MemberChip';

const PLAYER_CHOICE_CLASS = 'relative z-10 min-h-11 gap-1.5 py-1 pr-3 pl-1';

export interface InstrumentPlayerChip {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly isPrimary: boolean;
}

export interface InstrumentPlayerChipsProps {
  readonly players: readonly InstrumentPlayerChip[];
  readonly playedByLabel: string;
  readonly noPlayerLabel: string;
  readonly mainLabel: string;
  readonly toggleLabel: string;
  readonly onTogglePrimary: (memberId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function InstrumentPlayerChips({
  players,
  playedByLabel,
  noPlayerLabel,
  mainLabel,
  toggleLabel,
  onTogglePrimary,
}: InstrumentPlayerChipsProps): JSX.Element {
  if (players.length === 0) {
    return <p className="m-0 text-meta text-ink-soft italic">{noPlayerLabel}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-label text-ink-soft">{playedByLabel}</span>
      {players.map((player) => (
        <Chip
          key={player.memberId}
          pressed={player.isPrimary}
          aria-label={`${toggleLabel} — ${player.memberName}`}
          onPress={() => onTogglePrimary(player.memberId)}
          className={PLAYER_CHOICE_CLASS}
        >
          <MemberChip memberName={player.memberName} memberColor={player.memberColor} size="md" />
          <span>{player.memberName}</span>
          {player.isPrimary ? (
            <span className="inline-flex items-center gap-1 text-label">
              <Icon name="star" size="sm" />
              {mainLabel}
            </span>
          ) : null}
        </Chip>
      ))}
    </div>
  );
}
