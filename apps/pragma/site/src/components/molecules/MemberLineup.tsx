/** @Feature members */

import { composeClassName } from '../atoms/class-name.utils';
import { buildLineupChips } from './member-lineup.core';
import { MemberChip } from './MemberChip';

export interface LineupMember {
  id: string;
  name: string;
  color: string;
}

export interface LineupInstrument {
  id: string;
  name: string;
}

export interface MemberLineupProps {
  lineup: Record<string, readonly string[]>;
  members: readonly LineupMember[];
  instruments: readonly LineupInstrument[];
  maximumVisible?: number;
}

const MAXIMUM_VISIBLE_MEMBERS = 4;
const OVERLAP_CLASS = '-ml-1.5 first:ml-0 rounded-full ring-2 ring-bg-elev';

// @FollowsBlueprint molecule-presentational
export function MemberLineup({
  lineup,
  members,
  instruments,
  maximumVisible = MAXIMUM_VISIBLE_MEMBERS,
}: MemberLineupProps): JSX.Element {
  const { visible, hiddenCount, hasHiddenMembers } = buildLineupChips(
    lineup,
    members,
    instruments,
    maximumVisible,
  );
  return (
    <span className="inline-flex shrink-0 items-center">
      {visible.map((chip) => (
        <MemberChip
          key={chip.memberId}
          memberName={chip.memberName}
          memberColor={chip.memberColor}
          title={chip.title}
          className={OVERLAP_CLASS}
        />
      ))}
      {hasHiddenMembers ? (
        <span
          className={composeClassName(
            OVERLAP_CLASS,
            'inline-flex h-[22px] min-w-[22px] items-center justify-center bg-bg-sunk px-1 font-mono text-[10px] text-ink-500',
          )}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}
