/**
 * MemberLineup — row of bare MemberChips (no name labels) shown on
 * a SongCard's footer. Maps a lineup record (the instruments each member
 * holds) to a set of chips, using the resolved member's name and colour, and
 * naming every instrument in the chip's tooltip. Caller injects the members
 * and instruments to keep this molecule free of data-fetching concerns.
 * @Feature members
 */

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
}

// @FollowsBlueprint molecule-presentational
export function MemberLineup({ lineup, members, instruments }: MemberLineupProps): JSX.Element {
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {Object.entries(lineup).map(([memberId, instrumentIds]) => {
        const member = members.find((candidate) => candidate.id === memberId);
        if (!member) return null;
        const names = instrumentIds.flatMap((instrumentId) => {
          const instrument = instruments.find((candidate) => candidate.id === instrumentId);
          return instrument === undefined ? [] : [instrument.name];
        });
        const title = names.length > 0 ? `${member.name} — ${names.join(' + ')}` : member.name;
        return (
          <MemberChip
            key={memberId}
            memberName={member.name}
            memberColor={member.color}
            title={title}
          />
        );
      })}
    </span>
  );
}
